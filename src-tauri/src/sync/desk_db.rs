//! Desk discovery, DB connection lifecycle, and tag writes.
//!
//! Everything here is desk-scoped: each call targets `{desk}.db` + its `{desk}/`
//! folder directly, so a desk that isn't the active one is fully syncable without
//! touching the frontend's reactive state.

use std::time::Duration;

use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{Connection, SqliteConnection};

use super::migrations::migrate;
use super::paths::{resolve_desk_db_path, resolve_desk_dir};

/// Every desk that exists on disk, by folder name. Desks *are* folders, so the
/// `Balise/` subdirectories are the source of truth. Empty if the root is absent.
/// Dot-prefixed entries (e.g. the `.balise` settings folder) are skipped — they
/// are app data, not desks, and must never enter the sync share set.
pub(crate) fn list_desks(app: &tauri::AppHandle) -> Vec<String> {
    let Ok(root) = resolve_desk_dir(app, "") else {
        return Vec::new();
    };
    let mut desks = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&root) {
        for entry in entries.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                if let Some(name) = entry.file_name().to_str() {
                    if !name.starts_with('.') {
                        desks.push(name.to_string());
                    }
                }
            }
        }
    }
    desks
}

/// Creates a desk's folder + migrated DB if absent, returning an open connection.
/// Used when a peer shares a desk we've never seen, so it can be reconciled in the
/// same cycle without the frontend.
pub(crate) async fn ensure_desk_db(
    app: &tauri::AppHandle,
    desk_name: &str,
) -> Result<SqliteConnection, String> {
    let desk_dir = resolve_desk_dir(app, desk_name)?;
    std::fs::create_dir_all(&desk_dir).map_err(|e| e.to_string())?;
    let db_path = resolve_desk_db_path(app, desk_name)?;
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let opts = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true)
        .busy_timeout(Duration::from_secs(5));
    let mut conn = SqliteConnection::connect_with(&opts)
        .await
        .map_err(|e| e.to_string())?;
    migrate(&mut conn).await?;
    Ok(conn)
}

/// Ensures `{desk}.db` exists and is fully migrated, then releases the connection.
/// The single migration entry point: the frontend calls this before opening the
/// desk DB for queries, so schema versioning lives only in Rust (see
/// [`super::migrations`]) rather than being duplicated on the JS side.
#[tauri::command]
pub async fn migrate_desk_db(app: tauri::AppHandle, desk_name: String) -> Result<(), String> {
    let conn = ensure_desk_db(&app, &desk_name).await?;
    conn.close().await.map_err(|e| e.to_string())
}

/// Replaces a note's `note_tags` rows with `raw_names`, resolving each to the
/// existing canonical casing first (mirrors `setNoteTags`/`resolveCanonicalTags`).
/// Canonical resolution reads existing rows before the DELETE, and runs note by
/// note within the transaction so earlier inserts inform later resolutions.
pub(crate) async fn set_note_tags(
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
