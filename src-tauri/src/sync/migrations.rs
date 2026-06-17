//! Schema migrations for a desk DB — the single source of truth.
//!
//! The frontend runs no SQL migrations of its own: `loadDB` calls the
//! `migrate_desk_db` command (see [`super::desk_db`]) before opening a desk's DB
//! for queries, and device sync migrates via [`super::desk_db::ensure_desk_db`].
//! Each migration is a list of single statements (triggers kept whole) so they
//! run via the normal prepared-query path, and applied versions are tracked in a
//! `migrations` table so each one runs at most once per desk DB.

use std::collections::HashSet;

use sqlx::{Connection, SqliteConnection};

const MIGRATIONS: &[(i64, &[&str])] = &[
    (
        1,
        &[
            "CREATE TABLE IF NOT EXISTS notes (
                id         TEXT PRIMARY KEY,
                content    TEXT NOT NULL DEFAULT '',
                title      TEXT NOT NULL DEFAULT '',
                pinned     INTEGER NOT NULL DEFAULT 0,
                archived   INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            "CREATE TABLE IF NOT EXISTS note_tags (
                note_id TEXT NOT NULL,
                tag     TEXT NOT NULL,
                PRIMARY KEY (note_id, tag),
                FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
            )",
            "CREATE TABLE IF NOT EXISTS tag_settings (
                tag          TEXT PRIMARY KEY,
                color        TEXT NOT NULL DEFAULT '#7F77DD',
                display_name TEXT,
                pinned       INTEGER NOT NULL DEFAULT 0
            )",
            "CREATE VIEW IF NOT EXISTS tags AS
                SELECT DISTINCT tag FROM note_tags ORDER BY tag",
            "CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
                id   UNINDEXED,
                type UNINDEXED,
                content,
                tokenize='unicode61'
            )",
            "CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)",
            "CREATE INDEX IF NOT EXISTS idx_notes_pinned     ON notes(pinned)",
            "CREATE INDEX IF NOT EXISTS idx_notes_archived   ON notes(archived)",
            "CREATE INDEX IF NOT EXISTS idx_note_tags_tag    ON note_tags(tag)",
            "CREATE TRIGGER IF NOT EXISTS search_index_note_insert AFTER INSERT ON notes BEGIN
                INSERT INTO search_index(id, type, content) VALUES (new.id, 'note', new.content);
            END",
            "CREATE TRIGGER IF NOT EXISTS search_index_note_update AFTER UPDATE OF content ON notes BEGIN
                UPDATE search_index SET content = new.content WHERE id = new.id AND type = 'note';
            END",
            "CREATE TRIGGER IF NOT EXISTS search_index_note_delete AFTER DELETE ON notes BEGIN
                DELETE FROM search_index WHERE id = old.id AND type = 'note';
            END",
        ],
    ),
    (
        2,
        &[
            "ALTER TABLE notes ADD COLUMN preview TEXT NOT NULL DEFAULT ''",
            "UPDATE notes SET preview = TRIM(SUBSTR(TRIM(SUBSTR(content, INSTR(content, CHAR(10)))), 1, 140))",
        ],
    ),
    (
        3,
        &[
            "CREATE TABLE IF NOT EXISTS deletions (
                id         TEXT PRIMARY KEY,
                deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
        ],
    ),
];

pub(crate) async fn migrate(conn: &mut SqliteConnection) -> Result<(), String> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS migrations (
            version    INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )
    .execute(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    let applied: HashSet<i64> = sqlx::query_scalar("SELECT version FROM migrations")
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .collect();

    for (version, statements) in MIGRATIONS {
        if applied.contains(version) {
            continue;
        }
        let mut tx = conn.begin().await.map_err(|e| e.to_string())?;
        for stmt in *statements {
            sqlx::query(stmt)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
        sqlx::query("INSERT INTO migrations (version) VALUES (?)")
            .bind(version)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        tx.commit().await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqliteConnectOptions;
    use std::str::FromStr;

    async fn mem_db() -> SqliteConnection {
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        SqliteConnection::connect_with(&opts).await.unwrap()
    }

    async fn applied_versions(conn: &mut SqliteConnection) -> Vec<i64> {
        sqlx::query_scalar("SELECT version FROM migrations ORDER BY version")
            .fetch_all(conn)
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn runs_all_migrations_and_builds_schema() {
        let mut conn = mem_db().await;
        migrate(&mut conn).await.unwrap();

        assert_eq!(applied_versions(&mut conn).await, vec![1, 2, 3]);
        // migration 2 adds `preview`; migration 3 adds `deletions`.
        sqlx::query("SELECT preview FROM notes").fetch_all(&mut conn).await.unwrap();
        sqlx::query("SELECT id, deleted_at FROM deletions").fetch_all(&mut conn).await.unwrap();
    }

    #[tokio::test]
    async fn migrate_is_idempotent() {
        let mut conn = mem_db().await;
        migrate(&mut conn).await.unwrap();
        // A second run must apply nothing and must not error.
        migrate(&mut conn).await.unwrap();
        assert_eq!(applied_versions(&mut conn).await, vec![1, 2, 3]);
    }
}
