import { getDB } from '$lib/utils/db';
import { syncNoteTags, loadTags } from '$lib/services/tags.svelte';

export interface Note {
	id: string;
	content: string;
	pinned: number;
	archived: number;
	created_at: string;
	updated_at: string;
}

export const UNTAGGED_FILTER = '__untagged__' as const;

export const noteState = $state({ notes: [] as Note[] });

export async function loadNotes(tag?: string | null, composedTags: string[] = []): Promise<void> {
	const db = getDB();

	if (tag === UNTAGGED_FILTER) {
		noteState.notes = await db.select<Note[]>(
			`SELECT * FROM notes
       WHERE id NOT IN (SELECT DISTINCT note_id FROM note_tags)
       ORDER BY pinned DESC, updated_at DESC`
		);
		return;
	}

	const allTags = tag ? [tag, ...composedTags] : composedTags;

	if (allTags.length === 0) {
		noteState.notes = await db.select<Note[]>(
			'SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC'
		);
		return;
	}

	const existsClauses = allTags
		.map((_, i) => `AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = LOWER($${i + 1}))`)
		.join('\n     ');

	noteState.notes = await db.select<Note[]>(
		`SELECT n.* FROM notes n
     WHERE 1=1
     ${existsClauses}
     ORDER BY n.pinned DESC, n.updated_at DESC`,
		allTags
	);
}

async function loadNote(id: string): Promise<Note | null> {
	const db = getDB();
	const result = await db.select<Note[]>('SELECT * FROM notes WHERE id = $1', [id]);
	return result[0] ?? null;
}

export async function createNote(content = ''): Promise<string> {
	const db = getDB();
	const id = crypto.randomUUID();
	await db.execute('INSERT INTO notes (id, content) VALUES ($1, $2)', [id, content]);
	const note = await loadNote(id);
	if (note) noteState.notes = [note, ...noteState.notes];
	return id;
}

export async function updateNote(id: string, content: string): Promise<void> {
	const db = getDB();
	await db.execute("UPDATE notes SET content = $1, updated_at = datetime('now') WHERE id = $2", [
		content,
		id
	]);
	await syncNoteTags(id, content);
	const note = noteState.notes.find((n) => n.id === id);
	if (note) {
		note.content = content;
		const result = await db.select<{ updated_at: string }[]>(
			'SELECT updated_at FROM notes WHERE id = $1',
			[id]
		);
		if (result[0]) note.updated_at = result[0].updated_at;
	}
}

export async function deleteNote(id: string): Promise<void> {
	const db = getDB();
	await db.execute('DELETE FROM notes WHERE id = $1', [id]);
	noteState.notes = noteState.notes.filter((n) => n.id !== id);
	await loadTags();
}
