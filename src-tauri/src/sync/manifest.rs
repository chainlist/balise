//! The DB+FS data layer for device sync: build a desk's manifest, select the
//! bodies to transmit, and apply received bodies under the LWW guard.
//!
//! Last-write-wins matches the former TS `sync-reconcile`: newer `updated_at`
//! wins, an exact tie breaks toward the higher device id, and unparseable
//! timestamps lose (never clobber). The tie/clock comparisons live in
//! [`super::reconcile`].

use std::collections::HashMap;
use std::path::Path;

use serde::{Deserialize, Serialize};
use sqlx::{Connection, Row, SqliteConnection};

use super::desk_db::set_note_tags;
use super::extract::{extract_title, note_preview, Extractor, MagicTag};
use super::note_file::write_note_md;
use super::reconcile::{incoming_wins, ManifestEntry};

/// A full note body crossing the wire; on a tombstone every field but `id`,
/// `updated_at` and `deleted` is unused.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncedNote {
    id: String,
    content: String,
    pinned: bool,
    archived: bool,
    created_at: String,
    updated_at: String,
    deleted: bool,
}

/// How long a tombstone is kept before it is garbage-collected. A delete only
/// needs to outlive the longest realistic gap before every peer has seen it;
/// after that the tombstone is dead weight in every manifest exchange. The
/// trade-off: a device offline longer than this that still holds the live note
/// will resurrect it on its next sync, since we no longer carry the delete. 90
/// days is well past any normal offline window for a personal device set.
const TOMBSTONE_RETENTION_DAYS: i64 = 90;

/// Prunes tombstones older than [`TOMBSTONE_RETENTION_DAYS`] so `deletions` (and
/// thus every manifest) doesn't grow without bound. `julianday` parses both DB
/// timestamp forms (`YYYY-MM-DD HH:MM:SS` and ISO 8601), so it copes with locally
/// written and synced-in deletion times alike.
pub(crate) async fn gc_tombstones(conn: &mut SqliteConnection) -> Result<(), String> {
    sqlx::query("DELETE FROM deletions WHERE julianday(deleted_at) < julianday('now') - ?")
        .bind(TOMBSTONE_RETENTION_DAYS)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// The desk's manifest: every live note plus every tombstone as
/// `[id, updatedAt, deleted]`.
pub(crate) async fn build_manifest(
    conn: &mut SqliteConnection,
) -> Result<Vec<ManifestEntry>, String> {
    let rows = sqlx::query(
        "SELECT id, updated_at, 0 AS deleted FROM notes
         UNION ALL
         SELECT id, deleted_at AS updated_at, 1 AS deleted FROM deletions",
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    let mut entries = Vec::with_capacity(rows.len());
    for row in rows {
        entries.push(ManifestEntry {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
            deleted: row.try_get::<i64, _>("deleted").map_err(|e| e.to_string())? != 0,
        });
    }
    Ok(entries)
}

/// The bodies to transmit for `ids`: live notes carry content; tombstoned ids
/// carry `deleted: true` with the deletion time as `updated_at`.
pub(crate) async fn select_notes(
    conn: &mut SqliteConnection,
    ids: &[String],
) -> Result<Vec<SyncedNote>, String> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let placeholders = vec!["?"; ids.len()].join(", ");

    let live_sql = format!(
        "SELECT id, content, pinned, archived, created_at, updated_at FROM notes WHERE id IN ({placeholders})"
    );
    let mut live_q = sqlx::query(&live_sql);
    for id in ids {
        live_q = live_q.bind(id);
    }
    let live = live_q.fetch_all(&mut *conn).await.map_err(|e| e.to_string())?;

    let dead_sql = format!("SELECT id, deleted_at FROM deletions WHERE id IN ({placeholders})");
    let mut dead_q = sqlx::query(&dead_sql);
    for id in ids {
        dead_q = dead_q.bind(id);
    }
    let dead = dead_q.fetch_all(&mut *conn).await.map_err(|e| e.to_string())?;

    let mut notes = Vec::with_capacity(live.len() + dead.len());
    for row in live {
        notes.push(SyncedNote {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            content: row.try_get("content").map_err(|e| e.to_string())?,
            pinned: row.try_get::<i64, _>("pinned").map_err(|e| e.to_string())? != 0,
            archived: row.try_get::<i64, _>("archived").map_err(|e| e.to_string())? != 0,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
            deleted: false,
        });
    }
    for row in dead {
        notes.push(SyncedNote {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            content: String::new(),
            pinned: false,
            archived: false,
            created_at: String::new(),
            updated_at: row.try_get("deleted_at").map_err(|e| e.to_string())?,
            deleted: true,
        });
    }
    Ok(notes)
}

/// The local LWW clock of an id: `(updated_at, deleted)`.
struct LocalClock {
    updated_at: String,
    deleted: bool,
}

/// Applies received bodies under the LWW guard, writing the DB rows in one
/// transaction and the `.md` files after it commits. Returns the number of notes
/// actually changed.
pub(crate) async fn apply_notes(
    conn: &mut SqliteConnection,
    desk_dir: &Path,
    notes: Vec<SyncedNote>,
    remote_device_id: &str,
    local_device_id: &str,
    magic_tags: &[MagicTag],
) -> Result<usize, String> {
    if notes.is_empty() {
        return Ok(0);
    }

    // Local clocks for the incoming ids: a live note outranks a tombstone.
    let mut clocks: HashMap<String, LocalClock> = HashMap::new();
    let placeholders = vec!["?"; notes.len()].join(", ");
    let live_sql = format!("SELECT id, updated_at FROM notes WHERE id IN ({placeholders})");
    let mut live_q = sqlx::query(&live_sql);
    for n in &notes {
        live_q = live_q.bind(&n.id);
    }
    for row in live_q.fetch_all(&mut *conn).await.map_err(|e| e.to_string())? {
        let id: String = row.try_get("id").map_err(|e| e.to_string())?;
        let updated_at: String = row.try_get("updated_at").map_err(|e| e.to_string())?;
        clocks.insert(id, LocalClock { updated_at, deleted: false });
    }
    let dead_sql = format!("SELECT id, deleted_at FROM deletions WHERE id IN ({placeholders})");
    let mut dead_q = sqlx::query(&dead_sql);
    for n in &notes {
        dead_q = dead_q.bind(&n.id);
    }
    for row in dead_q.fetch_all(&mut *conn).await.map_err(|e| e.to_string())? {
        let id: String = row.try_get("id").map_err(|e| e.to_string())?;
        clocks.entry(id).or_insert_with(|| LocalClock {
            updated_at: row.try_get::<String, _>("deleted_at").unwrap_or_default(),
            deleted: true,
        });
    }

    let extractor = Extractor::new(magic_tags);
    enum FileOp {
        Write(SyncedNote),
        Delete(String),
    }
    let mut file_ops: Vec<FileOp> = Vec::new();
    let mut changed = 0usize;

    let mut tx = conn.begin().await.map_err(|e| e.to_string())?;
    for note in notes {
        if let Some(local) = clocks.get(&note.id) {
            if !incoming_wins(
                &note.updated_at,
                &local.updated_at,
                remote_device_id,
                local_device_id,
            ) {
                continue;
            }
        }

        if note.deleted {
            sqlx::query(
                "INSERT INTO deletions (id, deleted_at) VALUES (?, ?)
                 ON CONFLICT(id) DO UPDATE SET deleted_at = ?",
            )
            .bind(&note.id)
            .bind(&note.updated_at)
            .bind(&note.updated_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

            let already_tombstone = clocks.get(&note.id).map(|c| c.deleted).unwrap_or(false);
            if !already_tombstone {
                // note_tags has ON DELETE CASCADE, but FK enforcement is per
                // connection and not guaranteed on, so clear tags explicitly.
                sqlx::query("DELETE FROM note_tags WHERE note_id = ?")
                    .bind(&note.id)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
                sqlx::query("DELETE FROM notes WHERE id = ?")
                    .bind(&note.id)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
                file_ops.push(FileOp::Delete(note.id.clone()));
            }
        } else {
            let exists = clocks.get(&note.id).map(|c| !c.deleted).unwrap_or(false);
            // The peer re-created a note we held as deleted: drop the tombstone.
            sqlx::query("DELETE FROM deletions WHERE id = ?")
                .bind(&note.id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;

            let title = extract_title(&note.content);
            let preview = note_preview(&note.content, &title);
            let tags = extractor.extract_tags(&note.content);

            if exists {
                sqlx::query(
                    "UPDATE notes SET content = ?, title = ?, preview = ?, pinned = ?, archived = ?, created_at = ?, updated_at = ? WHERE id = ?",
                )
                .bind(&note.content)
                .bind(&title)
                .bind(&preview)
                .bind(note.pinned as i32)
                .bind(note.archived as i32)
                .bind(&note.created_at)
                .bind(&note.updated_at)
                .bind(&note.id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
            } else {
                sqlx::query(
                    "INSERT INTO notes (id, content, title, preview, pinned, archived, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                )
                .bind(&note.id)
                .bind(&note.content)
                .bind(&title)
                .bind(&preview)
                .bind(note.pinned as i32)
                .bind(note.archived as i32)
                .bind(&note.created_at)
                .bind(&note.updated_at)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
            }

            set_note_tags(&mut tx, &note.id, &tags).await?;
            file_ops.push(FileOp::Write(note));
        }
        changed += 1;
    }
    tx.commit().await.map_err(|e| e.to_string())?;

    // File IO after the commit, mirroring fs-sync. Best-effort per file.
    for op in file_ops {
        let res = match op {
            FileOp::Write(note) => write_note_md(
                desk_dir,
                &note.id,
                &note.content,
                note.pinned,
                note.archived,
                &note.created_at,
                &note.updated_at,
            ),
            FileOp::Delete(id) => {
                std::fs::remove_file(desk_dir.join(format!("{id}.md"))).or_else(|e| {
                    if e.kind() == std::io::ErrorKind::NotFound {
                        Ok(())
                    } else {
                        Err(e.to_string())
                    }
                })
            }
        };
        if let Err(e) = res {
            log::warn!("sync apply file op failed: {e}");
        }
    }

    Ok(changed)
}
