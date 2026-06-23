import { getDb } from './backend/db';
import { fsService } from './backend/fs';
import { setDeskFileMtime } from './backend/tauri';
import { parseDbTimestamp } from '$lib/core/domain/shared/time';
import { SYSTEM_TAGS } from '$lib/core/domain/tag';
import { Note, type NoteListItem, type NoteSearchResult } from '$lib/core/domain/note';

// Data access for notes: both the SQLite rows and the `.md` file mirror live
// behind this one layer, speaking `Note` / `NoteListItem`. SQL lives only here,
// `getDb()` is internal (no `Database` parameter), and no derivation
// (`extractTitle` / `notePreview` / `extractTags`) is imported — the `Note`
// aggregate already carries title, preview, and tags. Each method is
// use-case-grained so the deferred Rust plan can swap a body for one `invoke`
// with no change above this layer.

interface RawNoteRow {
	id: string;
	title: string;
	preview: string;
	pinned: number;
	archived: number;
	created_at: string;
	updated_at: string;
}

const LIST_COLS = 'id, title, preview, pinned, archived, created_at, updated_at';
const LIST_COLS_N = 'n.id, n.title, n.preview, n.pinned, n.archived, n.created_at, n.updated_at';

function toListItem(raw: RawNoteRow): NoteListItem {
	return {
		id: raw.id,
		title: raw.title,
		preview: raw.preview,
		pinned: raw.pinned === 1,
		archived: raw.archived === 1,
		createdAt: raw.created_at,
		updatedAt: raw.updated_at
	};
}

// ─── note_tags writes (canonical-casing aware) ────────────────────────────────
// `note_tags` is part of the Note aggregate's persistence, so its writes live
// here (Concept 01 deliberately left them out of tag.repo). Canonical resolution
// MUST run before the DELETE — it reads existing rows to preserve first-seen
// casing.

async function resolveCanonicalTags(rawNames: string[]): Promise<string[]> {
	const valuesClause = rawNames.map((_, i) => `($${i + 1})`).join(', ');
	const rows = await getDb().select<{ canonical: string }[]>(
		`WITH raw(tag) AS (VALUES ${valuesClause})
     SELECT COALESCE(
       (SELECT nt.tag FROM note_tags nt WHERE LOWER(nt.tag) = LOWER(raw.tag) LIMIT 1),
       raw.tag
     ) AS canonical
     FROM raw`,
		rawNames
	);
	return rows.map((r) => r.canonical);
}

async function setNoteTags(noteId: string, rawNames: string[]): Promise<void> {
	const db = getDb();
	const names = rawNames.length > 0 ? await resolveCanonicalTags(rawNames) : [];
	await db.execute('DELETE FROM note_tags WHERE note_id = $1', [noteId]);
	if (names.length > 0) {
		const values = names.map((_, i) => `($1, $${i + 2})`).join(', ');
		await db.execute(`INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES ${values}`, [
			noteId,
			...names
		]);
	}
}

// ─── note row upsert ──────────────────────────────────────────────────────────
// One statement for both create and edit. On a local edit (`applyMeta` false)
// only content / title / preview / updated_at change, preserving
// pinned / archived / created_at — the same contract as the old UPDATE. A sync
// import (`applyMeta` true) applies the peer's flags and creation time too. A new
// row always takes every column from VALUES.

async function upsertNote(note: Note, applyMeta: boolean): Promise<void> {
	const row = note.toRow();
	const conflictSet = applyMeta
		? 'content = excluded.content, title = excluded.title, preview = excluded.preview, pinned = excluded.pinned, archived = excluded.archived, created_at = excluded.created_at, updated_at = excluded.updated_at'
		: 'content = excluded.content, title = excluded.title, preview = excluded.preview, updated_at = excluded.updated_at';
	await getDb().execute(
		`INSERT INTO notes (id, content, title, preview, pinned, archived, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT(id) DO UPDATE SET ${conflictSet}`,
		[
			row.id,
			row.content,
			row.title,
			row.preview,
			row.pinned,
			row.archived,
			row.created_at,
			row.updated_at
		]
	);
}

export const noteRepo = {
	// ─── reads ──────────────────────────────────────────────────────────────────

	async findByTags(tags: string[]): Promise<NoteListItem[]> {
		const db = getDb();
		if (tags.length === 0) {
			const rows = await db.select<RawNoteRow[]>(
				`SELECT ${LIST_COLS} FROM notes ORDER BY pinned DESC, updated_at DESC`
			);
			return rows.map(toListItem);
		}

		const existsClauses = tags
			.map(
				(_, i) =>
					`AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = LOWER($${i + 1}))`
			)
			.join('\n     ');

		const rows = await db.select<RawNoteRow[]>(
			`SELECT ${LIST_COLS_N} FROM notes n
     WHERE 1=1
     ${existsClauses}
     ORDER BY n.pinned DESC, n.updated_at DESC`,
			tags
		);
		return rows.map(toListItem);
	},

	async findUntagged(): Promise<NoteListItem[]> {
		const rows = await getDb().select<RawNoteRow[]>(
			`SELECT ${LIST_COLS} FROM notes
       WHERE NOT EXISTS (SELECT 1 FROM note_tags WHERE note_id = notes.id)
       ORDER BY pinned DESC, updated_at DESC`
		);
		return rows.map(toListItem);
	},

	async findById(id: string): Promise<NoteListItem | null> {
		const rows = await getDb().select<RawNoteRow[]>(
			`SELECT ${LIST_COLS} FROM notes WHERE id = $1`,
			[id]
		);
		return rows[0] ? toListItem(rows[0]) : null;
	},

	async loadContent(id: string): Promise<string> {
		const rows = await getDb().select<{ content: string }[]>(
			'SELECT content FROM notes WHERE id = $1',
			[id]
		);
		return rows[0]?.content ?? '';
	},

	/** Every note (any tag) created within the given UTC range, oldest first. */
	async findByCreatedDate(utcFrom: string, utcTo: string): Promise<NoteListItem[]> {
		const rows = await getDb().select<RawNoteRow[]>(
			`SELECT ${LIST_COLS} FROM notes
       WHERE created_at >= $1 AND created_at < $2
       ORDER BY created_at ASC`,
			[utcFrom, utcTo]
		);
		return rows.map(toListItem);
	},

	/** Journal notes created within the given UTC range, oldest first. */
	async findJournalByDate(utcFrom: string, utcTo: string): Promise<NoteListItem[]> {
		const rows = await getDb().select<RawNoteRow[]>(
			`SELECT ${LIST_COLS_N} FROM notes n
     WHERE n.created_at >= $1 AND n.created_at < $2
       AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = $3)
     ORDER BY n.created_at ASC`,
			[utcFrom, utcTo, SYSTEM_TAGS.JOURNAL]
		);
		return rows.map(toListItem);
	},

	/** Creation timestamps of every note, used to mark calendar days that have notes. */
	async createdDates(): Promise<string[]> {
		const rows = await getDb().select<{ created_at: string }[]>('SELECT created_at FROM notes');
		return rows.map((r) => r.created_at);
	},

	/** Creation timestamps of journal notes, used to mark journal days that have notes. */
	async journalCreatedDates(): Promise<string[]> {
		const rows = await getDb().select<{ created_at: string }[]>(
			`SELECT n.created_at FROM notes n
       WHERE EXISTS (SELECT 1 FROM note_tags WHERE note_id = n.id AND LOWER(tag) = $1)`,
			[SYSTEM_TAGS.JOURNAL]
		);
		return rows.map((r) => r.created_at);
	},

	/** Id + updated_at of every note, for the sync diff. */
	async allMeta(): Promise<{ id: string; updated_at: string }[]> {
		return getDb().select<{ id: string; updated_at: string }[]>('SELECT id, updated_at FROM notes');
	},

	async search(query: string): Promise<NoteSearchResult[]> {
		const db = getDb();
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
	},

	// ─── writes ───────────────────────────────────────────────────────────────

	/** Local create / edit: DB upsert (flags + created_at preserved on edit), tag
	 *  rewrite, and `.md` mirror — one use-case method per the README's rule 4. */
	async save(note: Note): Promise<void> {
		await upsertNote(note, false);
		await setNoteTags(note.id, note.tags);
		await this.writeFile(note);
	},

	/** Persist a note imported from a file or peer during sync: DB upsert applying
	 *  every field + tag rewrite. No `.md` mirror — the file is the source. */
	async importNote(note: Note): Promise<void> {
		await upsertNote(note, true);
		await setNoteTags(note.id, note.tags);
	},

	/** Tombstone (so the deletion propagates to peers) + row + `.md` file. */
	async delete(id: string): Promise<void> {
		await this.insertDeletion(id);
		await getDb().execute('DELETE FROM notes WHERE id = $1', [id]);
		await this.deleteFile(id);
	},

	/**
	 * Record a deletion tombstone in the `deletions` table. Kept separate from
	 * `notes` so the row can be hard-deleted while the tombstone survives for sync.
	 * Pass `deletedAt` to preserve a peer's deletion time when applying a synced
	 * tombstone; omit it for a local delete (stamped now). Exposed for the Sync
	 * compatibility surface.
	 */
	async insertDeletion(id: string, deletedAt?: string): Promise<void> {
		const db = getDb();
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
	},

	/**
	 * Write `{id}.md` and pin its mtime to `updatedAt`. fs-sync compares mtimes
	 * against DB rows, so without this pin our own write (mtime = now) would look
	 * newer than the row and get re-imported, bumping `updated_at` forward and
	 * making device-sync re-send unchanged notes every cycle. Best-effort: a
	 * failure only loses the optimisation, never the write. Exposed for the Sync
	 * compatibility surface.
	 */
	async writeFile(note: Note): Promise<void> {
		if (!fsService.currentDesk) return;
		const name = `${note.id}.md`;
		await fsService.writeTextFile(name, note.buildFile());
		try {
			await setDeskFileMtime(fsService.currentDesk, name, parseDbTimestamp(note.updatedAt));
		} catch (e) {
			console.warn('failed to align note file mtime:', e);
		}
	},

	async deleteFile(id: string): Promise<void> {
		if (!fsService.currentDesk) return;
		await fsService.remove(`${id}.md`);
	}
};
