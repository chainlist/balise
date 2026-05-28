import Database from '@tauri-apps/plugin-sql';

interface Migration {
	version: number;
	sql: string;
}

const MIGRATIONS: Migration[] = [
	{
		version: 1,
		sql: `
      CREATE TABLE IF NOT EXISTS notes (
        id         TEXT PRIMARY KEY,
        content    TEXT NOT NULL DEFAULT '',
        title      TEXT NOT NULL DEFAULT '',
        pinned     INTEGER NOT NULL DEFAULT 0,
        archived   INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag     TEXT NOT NULL,
        PRIMARY KEY (note_id, tag),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tag_settings (
        tag          TEXT PRIMARY KEY,
        color        TEXT NOT NULL DEFAULT '#7F77DD',
        display_name TEXT,
        pinned       INTEGER NOT NULL DEFAULT 0
      );

      CREATE VIEW IF NOT EXISTS tags AS
        SELECT DISTINCT tag FROM note_tags ORDER BY tag;

      CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        id   UNINDEXED,
        type UNINDEXED,
        content,
        tokenize='unicode61'
      );

      CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
      CREATE INDEX IF NOT EXISTS idx_notes_pinned     ON notes(pinned);
      CREATE INDEX IF NOT EXISTS idx_notes_archived   ON notes(archived);
      CREATE INDEX IF NOT EXISTS idx_note_tags_tag    ON note_tags(tag);

      CREATE TRIGGER IF NOT EXISTS search_index_note_insert AFTER INSERT ON notes BEGIN
        INSERT INTO search_index(id, type, content) VALUES (new.id, 'note', new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS search_index_note_update AFTER UPDATE OF content ON notes BEGIN
        UPDATE search_index SET content = new.content WHERE id = new.id AND type = 'note';
      END;

      CREATE TRIGGER IF NOT EXISTS search_index_note_delete AFTER DELETE ON notes BEGIN
        DELETE FROM search_index WHERE id = old.id AND type = 'note';
      END;
    `
	},
	{
		version: 2,
		sql: `
      ALTER TABLE notes ADD COLUMN preview TEXT NOT NULL DEFAULT '';
      UPDATE notes SET preview = TRIM(SUBSTR(TRIM(SUBSTR(content, INSTR(content, CHAR(10)))), 1, 140));
    `
	}
	// add future migrations here as { version: 3, sql: '...' }
];

export async function migrate(db: Database): Promise<void> {
	await db.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

	const applied = await db.select<{ version: number }[]>(
		'SELECT version FROM migrations ORDER BY version'
	);
	const appliedVersions = new Set(applied.map((r) => r.version));

	for (const migration of MIGRATIONS) {
		if (appliedVersions.has(migration.version)) continue;
		await db.execute('BEGIN');
		try {
			await db.execute(migration.sql);
			await db.execute('INSERT INTO migrations (version) VALUES ($1)', [migration.version]);
			await db.execute('COMMIT');
		} catch (err) {
			await db.execute('ROLLBACK');
			throw err;
		}
	}
}
