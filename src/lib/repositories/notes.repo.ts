import type Database from '@tauri-apps/plugin-sql';
import { extractTitle, notePreview } from '$lib/utils/note-title';
import type { Note, NoteSearchResult } from '$lib/models/note';
export type { Note, NoteSearchResult } from '$lib/models/note';

interface RawNote {
	id: string;
	title: string;
	preview: string;
	content?: string;
	pinned: number;
	archived: number;
	created_at: string;
	updated_at: string;
}

function mapNote(raw: RawNote): Note {
	return { ...raw, pinned: raw.pinned === 1, archived: raw.archived === 1 };
}

const NOTE_COLS = 'id, title, preview, pinned, archived, created_at, updated_at';
const NOTE_COLS_N = 'n.id, n.title, n.preview, n.pinned, n.archived, n.created_at, n.updated_at';

export async function queryNotesByTags(db: Database, tags: string[]): Promise<Note[]> {
	if (tags.length === 0) {
		const rows = await db.select<RawNote[]>(
			`SELECT ${NOTE_COLS} FROM notes ORDER BY pinned DESC, updated_at DESC`
		);
		return rows.map(mapNote);
	}

	const existsClauses = tags
		.map(
			(_, i) =>
				`AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = LOWER($${i + 1}))`
		)
		.join('\n     ');

	const rows = await db.select<RawNote[]>(
		`SELECT ${NOTE_COLS_N} FROM notes n
     WHERE 1=1
     ${existsClauses}
     ORDER BY n.pinned DESC, n.updated_at DESC`,
		tags
	);
	return rows.map(mapNote);
}

export async function queryUntaggedNotes(db: Database): Promise<Note[]> {
	const rows = await db.select<RawNote[]>(
		`SELECT ${NOTE_COLS} FROM notes
       WHERE id NOT IN (SELECT DISTINCT note_id FROM note_tags)
       ORDER BY pinned DESC, updated_at DESC`
	);
	return rows.map(mapNote);
}

export async function queryNoteById(db: Database, id: string): Promise<Note | null> {
	const rows = await db.select<RawNote[]>(
		`SELECT ${NOTE_COLS} FROM notes WHERE id = $1`,
		[id]
	);
	return rows[0] ? mapNote(rows[0]) : null;
}

export async function queryNoteContent(db: Database, id: string): Promise<string> {
	const rows = await db.select<{ content: string }[]>(
		'SELECT content FROM notes WHERE id = $1',
		[id]
	);
	return rows[0]?.content ?? '';
}

export async function insertNote(db: Database, id: string, content: string): Promise<void> {
	await db.execute('INSERT INTO notes (id, content, title, preview) VALUES ($1, $2, $3, $4)', [
		id,
		content,
		extractTitle(content),
		notePreview(content)
	]);
}

export async function insertNoteAt(
	db: Database,
	id: string,
	content: string,
	createdAt: string
): Promise<void> {
	await db.execute(
		'INSERT INTO notes (id, content, title, preview, created_at) VALUES ($1, $2, $3, $4, $5)',
		[id, content, extractTitle(content), notePreview(content), createdAt]
	);
}

export async function insertNoteWithMeta(
	db: Database,
	note: {
		id: string;
		content: string;
		pinned: boolean;
		archived: boolean;
		created_at: string;
		updated_at: string;
	}
): Promise<void> {
	await db.execute(
		'INSERT INTO notes (id, content, title, preview, pinned, archived, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
		[
			note.id,
			note.content,
			extractTitle(note.content),
			notePreview(note.content),
			note.pinned ? 1 : 0,
			note.archived ? 1 : 0,
			note.created_at,
			note.updated_at
		]
	);
}

export async function updateNoteContent(db: Database, id: string, content: string): Promise<void> {
	await db.execute(
		"UPDATE notes SET content = $1, title = $2, preview = $3, updated_at = datetime('now') WHERE id = $4",
		[content, extractTitle(content), notePreview(content), id]
	);
}

export async function updateNoteFromSync(
	db: Database,
	note: { id: string; content: string; pinned: boolean; archived: boolean; created_at: string }
): Promise<void> {
	await db.execute(
		"UPDATE notes SET content=$1, title=$2, preview=$3, pinned=$4, archived=$5, created_at=$6, updated_at=datetime('now') WHERE id=$7",
		[note.content, extractTitle(note.content), notePreview(note.content), note.pinned ? 1 : 0, note.archived ? 1 : 0, note.created_at, note.id]
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

export async function queryJournalNotesByDate(
	db: Database,
	utcFrom: string,
	utcTo: string
): Promise<Note[]> {
	const rows = await db.select<RawNote[]>(
		`SELECT ${NOTE_COLS_N} FROM notes n
     WHERE n.created_at >= $1 AND n.created_at < $2
       AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = 'journal')
     ORDER BY n.created_at ASC`,
		[utcFrom, utcTo]
	);
	return rows.map(mapNote);
}


export async function queryAllNotesMeta(
	db: Database
): Promise<{ id: string; updated_at: string }[]> {
	return db.select('SELECT id, updated_at FROM notes');
}

export async function queryNotesByIds(db: Database, ids: string[]): Promise<Note[]> {
	if (ids.length === 0) return [];
	const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
	const rows = await db.select<RawNote[]>(
		`SELECT ${NOTE_COLS} FROM notes WHERE id IN (${placeholders})`,
		ids
	);
	return rows.map(mapNote);
}

export async function queryNotesWithContentByIds(
	db: Database,
	ids: string[]
): Promise<(Note & { content: string })[]> {
	if (ids.length === 0) return [];
	const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
	const rows = await db.select<RawNote[]>(
		`SELECT ${NOTE_COLS}, content FROM notes WHERE id IN (${placeholders})`,
		ids
	);
	return rows.map((r) => ({ ...mapNote(r), content: r.content ?? '' }));
}

export async function searchNotes(db: Database, query: string): Promise<NoteSearchResult[]> {
	const q = query.trim();
	if (q.length < 1) return [];
	if (q.length < 3) {
		const rows = await db.select<{ id: string; title: string }[]>(
			`SELECT id, title FROM notes
			 WHERE LOWER(title) LIKE LOWER($1)
			 ORDER BY updated_at DESC
			 LIMIT 3`,
			[`%${q}%`]
		);
		return rows.map((r) => ({ ...r, excerpt: null }));
	}
	return db.select<NoteSearchResult[]>(
		`SELECT
		   n.id,
		   n.title,
		   snippet(search_index, 2, '<mark>', '</mark>', '...', 10) AS excerpt
		 FROM search_index
		 JOIN notes n ON n.id = search_index.id
		 WHERE search_index MATCH $1 AND search_index.type = 'note'
		 ORDER BY rank
		 LIMIT 3`,
		[q + '*']
	);
}
