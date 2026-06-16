//! Reading and writing the on-disk note file format: `{id}.md` with YAML
//! frontmatter. The writer and the two readers live together so a format change
//! touches one file.

use std::io::BufRead;
use std::path::Path;
use std::time::{Duration, SystemTime};

use super::timestamps::parse_db_timestamp;

/// Writes `{id}.md` with frontmatter and pins its mtime to `updated_at`, the
/// same contract as the TS `writeNoteFile`. Mtime pinning is best-effort: a
/// failure only loses the sync-loop optimisation, never the write.
///
/// Field-by-field so it can be shared between fs-sync (note bodies come from a
/// DB row) and device sync (note bodies arrive over the wire).
#[allow(clippy::too_many_arguments)]
pub(crate) fn write_note_md(
    desk_dir: &Path,
    id: &str,
    content: &str,
    pinned: bool,
    archived: bool,
    created_at: &str,
    updated_at: &str,
) -> Result<(), String> {
    let body = format!(
        "---\nid: {id}\npinned: {pinned}\narchived: {archived}\ncreated_at: {created_at}\nupdated_at: {updated_at}\n---\n{content}"
    );
    let path = desk_dir.join(format!("{id}.md"));
    std::fs::write(&path, body).map_err(|e| e.to_string())?;

    if let Some(ms) = parse_db_timestamp(updated_at) {
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

/// The note metadata carried in a file's frontmatter header.
pub(crate) struct Frontmatter {
    pub(crate) id: String,
    pub(crate) pinned: bool,
    pub(crate) archived: bool,
    pub(crate) created_at: String,
}

/// Parses a note file's leading `---` frontmatter block from `reader`. `None` if
/// the input doesn't open with a `---` delimiter or carries no `id` — the same
/// keys [`write_note_md`] emits.
pub(crate) fn parse_frontmatter(mut reader: impl BufRead) -> Option<Frontmatter> {
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

    Some(Frontmatter {
        id,
        pinned,
        archived,
        created_at,
    })
}

/// The note body with its leading `---` frontmatter block removed.
pub(crate) fn strip_frontmatter(raw: &str) -> String {
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
