import type Database from '@tauri-apps/plugin-sql';
import { extractTitle, notePreview } from '$lib/utils/note-utils';
import type { Note, NoteSearchResult } from '$lib/models/note';
import type { ManifestEntry, SyncedNote } from '$lib/models/sync';
import { SYSTEM_TAGS } from '$lib/utils/tag-constants';
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
       WHERE NOT EXISTS (SELECT 1 FROM note_tags WHERE note_id = notes.id)
       ORDER BY pinned DESC, updated_at DESC`
	);
	return rows.map(mapNote);
}

export async function queryNoteById(db: Database, id: string): Promise<Note | null> {
	const rows = await db.select<RawNote[]>(`SELECT ${NOTE_COLS} FROM notes WHERE id = $1`, [id]);
	return rows[0] ? mapNote(rows[0]) : null;
}

export async function queryNoteContent(db: Database, id: string): Promise<string> {
	const rows = await db.select<{ content: string }[]>('SELECT content FROM notes WHERE id = $1', [
		id
	]);
	return rows[0]?.content ?? '';
}

export async function insertNote(
	db: Database,
	note: {
		id: string;
		content: string;
		createdAt?: string;
		updatedAt?: string;
		pinned?: boolean;
		archived?: boolean;
	}
): Promise<void> {
	const title = extractTitle(note.content);
	const preview = notePreview(note.content);
	const cols = ['id', 'content', 'title', 'preview'];
	const vals: unknown[] = [note.id, note.content, title, preview];
	if (note.createdAt !== undefined) {
		cols.push('created_at');
		vals.push(note.createdAt);
	}
	if (note.updatedAt !== undefined) {
		cols.push('updated_at');
		vals.push(note.updatedAt);
	}
	if (note.pinned !== undefined) {
		cols.push('pinned');
		vals.push(note.pinned ? 1 : 0);
	}
	if (note.archived !== undefined) {
		cols.push('archived');
		vals.push(note.archived ? 1 : 0);
	}
	const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
	await db.execute(`INSERT INTO notes (${cols.join(', ')}) VALUES (${placeholders})`, vals);
}

export async function updateNote(
	db: Database,
	id: string,
	fields: {
		content: string;
		pinned?: boolean;
		archived?: boolean;
		createdAt?: string;
		updatedAt?: string;
	}
): Promise<void> {
	const title = extractTitle(fields.content);
	const preview = notePreview(fields.content);
	const sets = ['content = $1', `title = $2`, `preview = $3`];
	const vals: unknown[] = [fields.content, title, preview];
	if (fields.updatedAt !== undefined) {
		sets.push(`updated_at = $${vals.length + 1}`);
		vals.push(fields.updatedAt);
	} else {
		sets.push(`updated_at = datetime('now')`);
	}
	if (fields.pinned !== undefined) {
		sets.push(`pinned = $${vals.length + 1}`);
		vals.push(fields.pinned ? 1 : 0);
	}
	if (fields.archived !== undefined) {
		sets.push(`archived = $${vals.length + 1}`);
		vals.push(fields.archived ? 1 : 0);
	}
	if (fields.createdAt !== undefined) {
		sets.push(`created_at = $${vals.length + 1}`);
		vals.push(fields.createdAt);
	}
	vals.push(id);
	await db.execute(`UPDATE notes SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
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

/**
 * Records a tombstone so a deletion can propagate during device sync. Kept in a
 * separate table (not a column on `notes`) so the row can be hard-deleted and
 * every existing read query and fs-sync stays unaware of it. Pass `deletedAt`
 * to preserve a peer's deletion time when applying a synced tombstone; omit it
 * for a local delete (stamped now).
 */
export async function insertDeletion(db: Database, id: string, deletedAt?: string): Promise<void> {
	if (deletedAt === undefined) {
		await db.execute(
			`INSERT INTO deletions (id) VALUES ($1)
			 ON CONFLICT(id) DO UPDATE SET deleted_at = datetime('now')`,
			[id]
		);
	} else {
		await db.execute(
			`INSERT INTO deletions (id, deleted_at) VALUES ($1, $2)
			 ON CONFLICT(id) DO UPDATE SET deleted_at = $2`,
			[id, deletedAt]
		);
	}
}

/** Drops a tombstone, e.g. when a synced peer re-created a previously deleted note. */
export async function clearDeletion(db: Database, id: string): Promise<void> {
	await db.execute('DELETE FROM deletions WHERE id = $1', [id]);
}

/**
 * The device-sync manifest: every live note plus every tombstone, each as
 * `[id, updatedAt, deleted]`. `updatedAt` is the LWW clock (deletion time for
 * tombstones). Compare entries via parseDbTimestamp - the column mixes SQLite
 * and ISO timestamp forms.
 */
export async function queryManifest(db: Database): Promise<ManifestEntry[]> {
	const rows = await db.select<{ id: string; updated_at: string; deleted: number }[]>(
		`SELECT id, updated_at, 0 AS deleted FROM notes
		 UNION ALL
		 SELECT id, deleted_at AS updated_at, 1 AS deleted FROM deletions`
	);
	return rows.map((r) => ({ id: r.id, updatedAt: r.updated_at, deleted: r.deleted === 1 }));
}

/** Local LWW clock for one id: the live note, else a tombstone, else null. */
export async function queryClock(
	db: Database,
	id: string
): Promise<{ updatedAt: string; deleted: boolean } | null> {
	const live = await db.select<{ updated_at: string }[]>(
		'SELECT updated_at FROM notes WHERE id = $1',
		[id]
	);
	if (live[0]) return { updatedAt: live[0].updated_at, deleted: false };
	const dead = await db.select<{ deleted_at: string }[]>(
		'SELECT deleted_at FROM deletions WHERE id = $1',
		[id]
	);
	if (dead[0]) return { updatedAt: dead[0].deleted_at, deleted: true };
	return null;
}

/**
 * Builds the [`SyncedNote`] bodies to transmit for the given ids: live notes
 * carry their content, tombstoned ids carry `deleted: true` with the deletion
 * time as `updatedAt`.
 */
export async function querySyncNotes(db: Database, ids: string[]): Promise<SyncedNote[]> {
	if (ids.length === 0) return [];
	const ph = ids.map((_, i) => `$${i + 1}`).join(', ');
	const [live, dead] = await Promise.all([
		db.select<(RawNote & { content: string })[]>(
			`SELECT ${NOTE_COLS}, content FROM notes WHERE id IN (${ph})`,
			ids
		),
		db.select<{ id: string; deleted_at: string }[]>(
			`SELECT id, deleted_at FROM deletions WHERE id IN (${ph})`,
			ids
		)
	]);
	const notes: SyncedNote[] = live.map((r) => ({
		id: r.id,
		content: r.content ?? '',
		pinned: r.pinned === 1,
		archived: r.archived === 1,
		createdAt: r.created_at,
		updatedAt: r.updated_at,
		deleted: false
	}));
	for (const d of dead) {
		notes.push({
			id: d.id,
			content: '',
			pinned: false,
			archived: false,
			createdAt: '',
			updatedAt: d.deleted_at,
			deleted: true
		});
	}
	return notes;
}

export async function queryJournalNotesByDate(
	db: Database,
	utcFrom: string,
	utcTo: string
): Promise<Note[]> {
	const rows = await db.select<RawNote[]>(
		`SELECT ${NOTE_COLS_N} FROM notes n
     WHERE n.created_at >= $1 AND n.created_at < $2
       AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = $3)
     ORDER BY n.created_at ASC`,
		[utcFrom, utcTo, SYSTEM_TAGS.JOURNAL]
	);
	return rows.map(mapNote);
}

export async function queryAllNotesMeta(
	db: Database
): Promise<{ id: string; updated_at: string }[]> {
	return db.select('SELECT id, updated_at FROM notes');
}

export async function queryActiveTaskNotes(
	db: Database
): Promise<{ id: string; content: string; updated_at: string }[]> {
	return db.select(
		`SELECT n.id, n.content, n.updated_at
		 FROM notes n
		 WHERE EXISTS (
		   SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) IN ($1, $2)
		 )
		 ORDER BY n.updated_at DESC`,
		[SYSTEM_TAGS.TODO, SYSTEM_TAGS.INPROGRESS]
	);
}

const DONE_NOTES_LIMIT = 50;

export async function queryRecentDoneNotes(
	db: Database
): Promise<{ id: string; content: string; updated_at: string }[]> {
	return db.select(
		`SELECT n.id, n.content, n.updated_at
		 FROM notes n
		 WHERE EXISTS (
		   SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = $1
		 )
		 ORDER BY n.updated_at DESC
		 LIMIT $2`,
		[SYSTEM_TAGS.DONE, DONE_NOTES_LIMIT]
	);
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
