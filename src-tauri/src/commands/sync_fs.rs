//! Native filesystem <-> DB sync for a desk.
//!
//! Mirrors what `FsSyncService.syncDeskFiles` used to do in the frontend, but
//! runs entirely in Rust: scan the desk's `.md` files, diff them against the
//! desk's SQLite DB, import new/changed files (deriving title/preview/tags the
//! same way the TS side does), and write back any DB-only "orphan" notes. All
//! DB writes happen on a single sqlx connection inside one transaction, which
//! is the point of moving it here - a desk switch no longer pays a per-note
//! round-trip across the JS<->SQLite bridge.

use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::time::{Duration, SystemTime};

use chrono::{TimeZone, Utc};
use regex::Regex;
use serde::Deserialize;
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{Connection, Row, SqliteConnection};
use tauri::Manager;

/// One user-configured magic tag, mirroring the TS `MagicTag` shape.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MagicTag {
    pub pattern: String,
    pub match_type: String,
    pub tag: String,
}

struct DeskFileMeta {
    name: String,
    id: String,
    pinned: bool,
    archived: bool,
    created_at: String,
    mtime_ms: u64,
}

/// A DB note that has no matching file on disk; gets written back out.
struct OrphanNote {
    id: String,
    content: String,
    pinned: bool,
    archived: bool,
    created_at: String,
    updated_at: String,
}

#[tauri::command]
pub async fn sync_desk_files(
    app: tauri::AppHandle,
    desk_name: String,
    magic_tags: Vec<MagicTag>,
) -> Result<usize, String> {
    let docs_dir = app.path().document_dir().map_err(|e| e.to_string())?;
    let desk_dir = docs_dir.join("Balise").join(&desk_name);
    // plugin-sql resolves `sqlite:{desk}.db` against app_config_dir; match it
    // exactly so we open the same file (NOT app_data_dir, which only coincides
    // on Windows).
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let db_path = config_dir.join(format!("{desk_name}.db"));

    let files = scan_desk_files(&desk_dir)?;
    let extractor = Extractor::new(&magic_tags);

    let opts = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(false)
        .busy_timeout(Duration::from_secs(5));
    let mut conn = SqliteConnection::connect_with(&opts)
        .await
        .map_err(|e| e.to_string())?;

    // Existing notes: id -> updated_at (the LWW clock fs-sync diffs against).
    let mut db_map: HashMap<String, String> = HashMap::new();
    let rows = sqlx::query("SELECT id, updated_at FROM notes")
        .fetch_all(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    for row in rows {
        let id: String = row.try_get("id").map_err(|e| e.to_string())?;
        let updated_at: String = row.try_get("updated_at").map_err(|e| e.to_string())?;
        db_map.insert(id, updated_at);
    }

    let mut synced_ids: HashSet<String> = HashSet::new();
    let mut to_write: Vec<(DeskFileMeta, bool)> = Vec::new(); // (meta, is_create)
    for file in files {
        synced_ids.insert(file.id.clone());
        match db_map.get(&file.id) {
            None => to_write.push((file, true)),
            Some(updated_at) => {
                let newer = parse_db_timestamp(updated_at)
                    .map(|ms| file.mtime_ms as i64 > ms)
                    .unwrap_or(false);
                if newer {
                    to_write.push((file, false));
                }
            }
        }
    }

    // Import new/changed files in one transaction (one fsync for the batch).
    let mut tx = conn.begin().await.map_err(|e| e.to_string())?;
    for (meta, is_create) in &to_write {
        let raw = std::fs::read_to_string(desk_dir.join(&meta.name)).map_err(|e| e.to_string())?;
        let content = strip_frontmatter(&raw);
        let title = extract_title(&content);
        let preview = note_preview(&content, &title);
        let tags = extractor.extract_tags(&content);
        let updated_at = ms_to_iso_utc(meta.mtime_ms as i64);

        if *is_create {
            sqlx::query(
                "INSERT INTO notes (id, content, title, preview, pinned, archived, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&meta.id)
            .bind(&content)
            .bind(&title)
            .bind(&preview)
            .bind(meta.pinned as i32)
            .bind(meta.archived as i32)
            .bind(&meta.created_at)
            .bind(&updated_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        } else {
            sqlx::query(
                "UPDATE notes SET content = ?, title = ?, preview = ?, pinned = ?, archived = ?, created_at = ?, updated_at = ? WHERE id = ?",
            )
            .bind(&content)
            .bind(&title)
            .bind(&preview)
            .bind(meta.pinned as i32)
            .bind(meta.archived as i32)
            .bind(&meta.created_at)
            .bind(&updated_at)
            .bind(&meta.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        set_note_tags(&mut *tx, &meta.id, &tags).await?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;

    // Orphans: DB notes with no file on disk get written back out.
    let orphan_ids: Vec<&String> = db_map.keys().filter(|id| !synced_ids.contains(*id)).collect();
    if !orphan_ids.is_empty() {
        let placeholders = vec!["?"; orphan_ids.len()].join(", ");
        let sql = format!(
            "SELECT id, content, pinned, archived, created_at, updated_at FROM notes WHERE id IN ({placeholders})"
        );
        let mut q = sqlx::query(&sql);
        for id in &orphan_ids {
            q = q.bind(*id);
        }
        let rows = q.fetch_all(&mut conn).await.map_err(|e| e.to_string())?;
        let mut orphans = Vec::with_capacity(rows.len());
        for row in rows {
            orphans.push(OrphanNote {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                content: row.try_get("content").map_err(|e| e.to_string())?,
                pinned: row.try_get::<i64, _>("pinned").map_err(|e| e.to_string())? != 0,
                archived: row.try_get::<i64, _>("archived").map_err(|e| e.to_string())? != 0,
                created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
                updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
            });
        }
        for note in orphans {
            write_note_file(&desk_dir, &note)?;
        }
    }

    conn.close().await.map_err(|e| e.to_string())?;

    // Report only notes that already existed and were re-imported because their
    // file changed on disk - i.e. genuinely modified outside the app. New-file
    // creates are excluded so the first build of a desk's DB doesn't claim every
    // note was "modified externally".
    let updated_from_disk = to_write.iter().filter(|(_, is_create)| !*is_create).count();
    Ok(updated_from_disk)
}

// --- file IO ----------------------------------------------------------------

fn scan_desk_files(desk_dir: &Path) -> Result<Vec<DeskFileMeta>, String> {
    let mut files = Vec::new();
    for entry in std::fs::read_dir(desk_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()).map(str::to_string) else {
            continue;
        };
        if let Some(meta) = read_frontmatter_meta(&path, name) {
            files.push(meta);
        }
    }
    Ok(files)
}

fn read_frontmatter_meta(path: &Path, name: String) -> Option<DeskFileMeta> {
    let mtime_ms = std::fs::metadata(path)
        .ok()?
        .modified()
        .ok()?
        .duration_since(SystemTime::UNIX_EPOCH)
        .ok()?
        .as_millis() as u64;

    let file = std::fs::File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let mut line = String::new();

    reader.read_line(&mut line).ok()?;
    if line.trim_end() != "---" {
        return None;
    }

    let mut id = String::new();
    let mut pinned = false;
    let mut archived = false;
    let mut created_at = String::new();
    let mut found_end = false;

    loop {
        line.clear();
        if reader.read_line(&mut line).ok()? == 0 {
            break;
        }
        let trimmed = line.trim_end();
        if trimmed == "---" {
            found_end = true;
            break;
        }
        if let Some(colon) = trimmed.find(':') {
            let key = trimmed[..colon].trim();
            let value = trimmed[colon + 1..].trim();
            match key {
                "id" => id = value.to_string(),
                "pinned" => pinned = value == "true" || value == "1",
                "archived" => archived = value == "true" || value == "1",
                "created_at" => created_at = value.to_string(),
                _ => {}
            }
        }
    }

    if !found_end || id.is_empty() {
        return None;
    }

    Some(DeskFileMeta {
        name,
        id,
        pinned,
        archived,
        created_at,
        mtime_ms,
    })
}

fn strip_frontmatter(raw: &str) -> String {
    if !raw.starts_with("---\n") {
        return raw.to_string();
    }
    let rest = &raw[4..];
    if let Some(end) = rest.find("\n---\n") {
        rest[end + 5..].to_string()
    } else {
        raw.to_string()
    }
}

/// Writes `{id}.md` with frontmatter and pins its mtime to `updated_at`, the
/// same contract as the TS `writeNoteFile`. Mtime pinning is best-effort: a
/// failure only loses the sync-loop optimisation, never the write.
fn write_note_file(desk_dir: &Path, note: &OrphanNote) -> Result<(), String> {
    let body = format!(
        "---\nid: {}\npinned: {}\narchived: {}\ncreated_at: {}\nupdated_at: {}\n---\n{}",
        note.id, note.pinned, note.archived, note.created_at, note.updated_at, note.content
    );
    let path = desk_dir.join(format!("{}.md", note.id));
    std::fs::write(&path, body).map_err(|e| e.to_string())?;

    if let Some(ms) = parse_db_timestamp(&note.updated_at) {
        let mtime = SystemTime::UNIX_EPOCH + Duration::from_millis(ms.max(0) as u64);
        if let Err(e) = std::fs::OpenOptions::new()
            .write(true)
            .open(&path)
            .and_then(|file| file.set_modified(mtime))
        {
            log::warn!("failed to align note file mtime: {e}");
        }
    }
    Ok(())
}

// --- tags --------------------------------------------------------------------

/// Replaces a note's `note_tags` rows with `raw_names`, resolving each to the
/// existing canonical casing first (mirrors `setNoteTags`/`resolveCanonicalTags`).
/// Canonical resolution reads existing rows before the DELETE, and runs note by
/// note within the transaction so earlier inserts inform later resolutions.
async fn set_note_tags(
    tx: &mut sqlx::SqliteConnection,
    note_id: &str,
    raw_names: &[String],
) -> Result<(), String> {
    let mut names: Vec<String> = Vec::with_capacity(raw_names.len());
    for raw in raw_names {
        let canonical: Option<String> =
            sqlx::query_scalar("SELECT tag FROM note_tags WHERE LOWER(tag) = LOWER(?) LIMIT 1")
                .bind(raw)
                .fetch_optional(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        names.push(canonical.unwrap_or_else(|| raw.clone()));
    }

    sqlx::query("DELETE FROM note_tags WHERE note_id = ?")
        .bind(note_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for name in names {
        sqlx::query("INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES (?, ?)")
            .bind(note_id)
            .bind(&name)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// --- extraction (ports of note-utils.ts / tags.svelte.ts) --------------------

enum MagicMatcher {
    /// `^[ \t]*<pattern>` (line start, after optional leading whitespace).
    StartsWith(Regex),
    /// `<pattern>[ \t]*$` (line end, before optional trailing whitespace).
    EndsWith(Regex),
    /// Plain substring.
    Contains(String),
    /// Substring bounded by line-start/space/tab before and space/tab/line-end after.
    ContainsWord(String),
}

struct Extractor {
    hashtag_re: Regex,
    fence_re: Regex,
    magic: Vec<(MagicMatcher, String)>, // (matcher, tag)
}

impl Extractor {
    fn new(magic_tags: &[MagicTag]) -> Self {
        let magic = magic_tags
            .iter()
            .filter_map(|mt| {
                let esc = regex::escape(&mt.pattern);
                let matcher = match mt.match_type.as_str() {
                    "starts_with" => {
                        MagicMatcher::StartsWith(Regex::new(&format!(r"(?m)^[ \t]*{esc}")).ok()?)
                    }
                    "ends_with" => {
                        MagicMatcher::EndsWith(Regex::new(&format!(r"(?m){esc}[ \t]*$")).ok()?)
                    }
                    "contains" => MagicMatcher::Contains(mt.pattern.clone()),
                    "contains_word" => MagicMatcher::ContainsWord(mt.pattern.clone()),
                    _ => return None,
                };
                Some((matcher, mt.tag.clone()))
            })
            .collect();

        Extractor {
            // TAG_PATTERN_SOURCE
            hashtag_re: Regex::new(r"#([a-zA-Z0-9/]{2,})(?:\(([^)]+)\))?").unwrap(),
            // FENCE_LANG_SOURCE, multiline
            fence_re: Regex::new(r"(?m)^```([a-zA-Z][a-zA-Z0-9]*)").unwrap(),
            magic,
        }
    }

    /// Order-preserving, de-duplicated union of hashtag, code, and magic tags.
    fn extract_tags(&self, content: &str) -> Vec<String> {
        let mut seen: HashSet<String> = HashSet::new();
        let mut out: Vec<String> = Vec::new();
        let push = |seen: &mut HashSet<String>, out: &mut Vec<String>, tag: String| {
            if seen.insert(tag.clone()) {
                out.push(tag);
            }
        };

        for cap in self.hashtag_re.captures_iter(content) {
            push(&mut seen, &mut out, cap[1].to_string());
        }
        for cap in self.fence_re.captures_iter(content) {
            push(&mut seen, &mut out, "code".to_string());
            push(&mut seen, &mut out, cap[1].to_lowercase());
        }
        for (matcher, tag) in &self.magic {
            if matcher.matches(content) {
                push(&mut seen, &mut out, tag.clone());
            }
        }
        out
    }
}

impl MagicMatcher {
    fn matches(&self, content: &str) -> bool {
        match self {
            MagicMatcher::StartsWith(re) | MagicMatcher::EndsWith(re) => re.is_match(content),
            MagicMatcher::Contains(p) => content.contains(p.as_str()),
            MagicMatcher::ContainsWord(p) => contains_word(content, p),
        }
    }
}

/// True if `pattern` occurs bounded by (line-start or space/tab) before and
/// (space/tab or line-end) after - the lookbehind/lookahead the `regex` crate
/// can't express, done by hand over byte offsets.
fn contains_word(content: &str, pattern: &str) -> bool {
    if pattern.is_empty() {
        return false;
    }
    let bytes = content.as_bytes();
    let mut start = 0;
    while let Some(rel) = content[start..].find(pattern) {
        let at = start + rel;
        let before_ok = at == 0
            || matches!(bytes[at - 1], b' ' | b'\t' | b'\n');
        let after = at + pattern.len();
        let after_ok = after == bytes.len()
            || matches!(bytes[after], b' ' | b'\t' | b'\n');
        if before_ok && after_ok {
            return true;
        }
        start = at + 1;
    }
    false
}

/// First non-empty line, ATX heading marker stripped (port of `extractTitle`).
fn extract_title(content: &str) -> String {
    static HEADING: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    let heading = HEADING.get_or_init(|| Regex::new(r"^#{1,6}\s+").unwrap());
    for line in content.split('\n') {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            return heading.replace(trimmed, "").trim().to_string();
        }
    }
    String::new()
}

/// Content after the title, trimmed, capped at 140 chars (port of `notePreview`).
fn note_preview(content: &str, title: &str) -> String {
    let rest = if !title.is_empty() {
        match content.find(title) {
            Some(i) => &content[i + title.len()..],
            None => content,
        }
    } else {
        content
    };
    rest.trim().chars().take(140).collect()
}

// --- timestamps (port of time.ts) -------------------------------------------

/// Parse either DB timestamp form ('YYYY-MM-DD HH:MM:SS' UTC or ISO 8601) to
/// epoch ms. `None` on unparseable input - callers treat that as "not newer"
/// to avoid clobbering, mirroring JS `NaN` comparisons being false.
fn parse_db_timestamp(ts: &str) -> Option<i64> {
    let normalized = if ts.contains('T') {
        ts.to_string()
    } else {
        format!("{}Z", ts.replacen(' ', "T", 1))
    };
    chrono::DateTime::parse_from_rfc3339(&normalized)
        .ok()
        .map(|dt| dt.timestamp_millis())
}

/// Format epoch ms as an ISO 8601 UTC string with ms precision, matching JS
/// `new Date(ms).toISOString()` (`YYYY-MM-DDTHH:MM:SS.sssZ`).
fn ms_to_iso_utc(ms: i64) -> String {
    Utc.timestamp_millis_opt(ms)
        .single()
        .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string())
        .unwrap_or_default()
}
