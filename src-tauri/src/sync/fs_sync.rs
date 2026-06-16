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
use std::io::BufReader;
use std::path::Path;
use std::time::{Duration, SystemTime};

use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{Connection, Row, SqliteConnection};

use super::desk_db::set_note_tags;
use super::extract::{extract_title, note_preview, Extractor, MagicTag};
use super::note_file::{parse_frontmatter, strip_frontmatter, write_note_md};
use super::paths::{resolve_desk_db_path, resolve_desk_dir};
use super::timestamps::{ms_to_iso_utc, parse_db_timestamp};

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
    let desk_dir = resolve_desk_dir(&app, &desk_name)?;
    let db_path = resolve_desk_db_path(&app, &desk_name)?;

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
    let fm = parse_frontmatter(BufReader::new(file))?;

    Some(DeskFileMeta {
        name,
        id: fm.id,
        pinned: fm.pinned,
        archived: fm.archived,
        created_at: fm.created_at,
        mtime_ms,
    })
}

/// Writes a DB-only orphan note back out as `{id}.md`.
fn write_note_file(desk_dir: &Path, note: &OrphanNote) -> Result<(), String> {
    write_note_md(
        desk_dir,
        &note.id,
        &note.content,
        note.pinned,
        note.archived,
        &note.created_at,
        &note.updated_at,
    )
}
