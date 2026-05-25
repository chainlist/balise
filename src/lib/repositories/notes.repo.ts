import type Database from '@tauri-apps/plugin-sql';
import { extractTitle } from '$lib/utils/note-title';

interface RawNote {
	id: string;
	title: string;
	content: string;
	pinned: number;
	archived: number;
	created_at: string;
	updated_at: string;
}

export interface Note {
	id: string;
	title: string;
	content: string;
	pinned: boolean;
	archived: boolean;
	created_at: string;
	updated_at: string;
}

function mapNote(raw: RawNote): Note {
	return { ...raw, pinned: raw.pinned === 1, archived: raw.archived === 1 };
}

export async function queryNotesByTags(db: Database, tags: string[]): Promise<Note[]> {
	if (tags.length === 0) {
		const rows = await db.select<RawNote[]>('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC');
		return rows.map(mapNote);
	}

	const existsClauses = tags
		.map(
			(_, i) =>
				`AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = LOWER($${i + 1}))`
		)
		.join('\n     ');

	const rows = await db.select<RawNote[]>(
		`SELECT n.* FROM notes n
     WHERE 1=1
     ${existsClauses}
     ORDER BY n.pinned DESC, n.updated_at DESC`,
		tags
	);
	return rows.map(mapNote);
}

export async function queryUntaggedNotes(db: Database): Promise<Note[]> {
	const rows = await db.select<RawNote[]>(
		`SELECT * FROM notes
       WHERE id NOT IN (SELECT DISTINCT note_id FROM note_tags)
       ORDER BY pinned DESC, updated_at DESC`
	);
	return rows.map(mapNote);
}

export async function queryNoteById(db: Database, id: string): Promise<Note | null> {
	const rows = await db.select<RawNote[]>('SELECT * FROM notes WHERE id = $1', [id]);
	return rows[0] ? mapNote(rows[0]) : null;
}

export async function insertNote(db: Database, id: string, content: string): Promise<void> {
	await db.execute('INSERT INTO notes (id, content, title) VALUES ($1, $2, $3)', [
		id,
		content,
		extractTitle(content)
	]);
}

export async function updateNoteContent(db: Database, id: string, content: string): Promise<void> {
	await db.execute(
		"UPDATE notes SET content = $1, title = $2, updated_at = datetime('now') WHERE id = $3",
		[content, extractTitle(content), id]
	);
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

export async function queryTotalNotesCount(db: Database): Promise<number> {
	const result = await db.select<[{ count: number }]>('SELECT COUNT(*) as count FROM notes');
	return result[0]?.count ?? 0;
}

export async function queryAllNotesMeta(
	db: Database
): Promise<{ id: string; updated_at: string }[]> {
	return db.select('SELECT id, updated_at FROM notes');
}

export async function queryNotesByIds(db: Database, ids: string[]): Promise<Note[]> {
	if (ids.length === 0) return [];
	const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
	const rows = await db.select<RawNote[]>(`SELECT * FROM notes WHERE id IN (${placeholders})`, ids);
	return rows.map(mapNote);
}

export async function searchNotes(
	db: Database,
	query: string
): Promise<Pick<Note, 'id' | 'title'>[]> {
	const q = query.trim();
	if (q.length < 3) return [];
	return db.select<{ id: string; title: string }[]>(
		`SELECT n.id, n.title
		 FROM notes_fts
		 JOIN notes n ON n.id = notes_fts.id
		 WHERE notes_fts MATCH $1
		 ORDER BY rank
		 LIMIT 3`,
		[q]
	);
}
