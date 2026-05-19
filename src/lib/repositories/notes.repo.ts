import type Database from '@tauri-apps/plugin-sql';

export interface Note {
	id: string;
	content: string;
	pinned: number;
	archived: number;
	created_at: string;
	updated_at: string;
}

export async function queryNotesByTags(db: Database, tags: string[]): Promise<Note[]> {
	if (tags.length === 0) {
		return db.select<Note[]>('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC');
	}

	const existsClauses = tags
		.map(
			(_, i) =>
				`AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = LOWER($${i + 1}))`
		)
		.join('\n     ');

	return db.select<Note[]>(
		`SELECT n.* FROM notes n
     WHERE 1=1
     ${existsClauses}
     ORDER BY n.pinned DESC, n.updated_at DESC`,
		tags
	);
}

export async function queryUntaggedNotes(db: Database): Promise<Note[]> {
	return db.select<Note[]>(
		`SELECT * FROM notes
       WHERE id NOT IN (SELECT DISTINCT note_id FROM note_tags)
       ORDER BY pinned DESC, updated_at DESC`
	);
}

export async function queryNoteById(db: Database, id: string): Promise<Note | null> {
	const rows = await db.select<Note[]>('SELECT * FROM notes WHERE id = $1', [id]);
	return rows[0] ?? null;
}

export async function insertNote(db: Database, id: string, content: string): Promise<void> {
	await db.execute('INSERT INTO notes (id, content) VALUES ($1, $2)', [id, content]);
}

export async function updateNoteContent(
	db: Database,
	id: string,
	content: string
): Promise<void> {
	await db.execute("UPDATE notes SET content = $1, updated_at = datetime('now') WHERE id = $2", [
		content,
		id
	]);
}

export async function queryNoteUpdatedAt(db: Database, id: string): Promise<string | null> {
	const rows = await db.select<{ updated_at: string }[]>(
		'SELECT updated_at FROM notes WHERE id = $1',
		[id]
	);
	return rows[0]?.updated_at ?? null;
}

export async function deleteNoteById(db: Database, id: string): Promise<void> {
	await db.execute('DELETE FROM notes WHERE id = $1', [id]);
}
