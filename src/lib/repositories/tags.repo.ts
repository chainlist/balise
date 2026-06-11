import type Database from '@tauri-apps/plugin-sql';
import type { RelatedTag } from '$lib/models/tag';
export type { RelatedTag } from '$lib/models/tag';

export interface RawTag {
	tag: string;
	color: string | null;
	display_name: string | null;
	pinned: number;
	count: number;
}

export async function queryTagsWithCounts(db: Database): Promise<RawTag[]> {
	return db.select<RawTag[]>(`
      SELECT t.tag, ts.color, ts.display_name, COALESCE(ts.pinned, 0) AS pinned, COUNT(nt.note_id) AS count
      FROM tags t
      LEFT JOIN note_tags nt ON LOWER(nt.tag) = LOWER(t.tag)
      LEFT JOIN tag_settings ts ON ts.tag = t.tag
      GROUP BY t.tag
      ORDER BY COALESCE(ts.pinned, 0) DESC, t.tag COLLATE NOCASE
    `);
}

export async function queryUntaggedCount(db: Database): Promise<number> {
	const rows = await db.select<{ count: number }[]>(
		`SELECT COUNT(*) AS count FROM notes WHERE NOT EXISTS (SELECT 1 FROM note_tags WHERE note_id = notes.id)`
	);
	return rows[0]?.count ?? 0;
}

export async function upsertTagSettings(
	db: Database,
	tag: string,
	settings: Partial<{ color: string; display_name: string | null; pinned: boolean }>
): Promise<void> {
	const pinnedVal = settings.pinned == null ? null : settings.pinned ? 1 : 0;
	await db.execute(
		`INSERT INTO tag_settings (tag, color, display_name, pinned)
       VALUES ($1, COALESCE($2, '#7F77DD'), $3, COALESCE($4, 0))
       ON CONFLICT(tag) DO UPDATE SET
         color        = COALESCE($2, color),
         display_name = $3,
         pinned       = COALESCE($4, pinned)`,
		[tag, settings.color ?? null, settings.display_name ?? null, pinnedVal]
	);
}

export async function resolveCanonicalTags(
	db: Database,
	rawNames: string[]
): Promise<string[]> {
	const valuesClause = rawNames.map((_, i) => `($${i + 1})`).join(', ');
	const rows = await db.select<{ canonical: string }[]>(
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

export async function deleteNoteTags(db: Database, noteId: string): Promise<void> {
	await db.execute('DELETE FROM note_tags WHERE note_id = $1', [noteId]);
}

export async function insertNoteTags(
	db: Database,
	noteId: string,
	names: string[]
): Promise<void> {
	const insertClause = names.map((_, i) => `($1, $${i + 2})`).join(', ');
	await db.execute(
		`INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES ${insertClause}`,
		[noteId, ...names]
	);
}

/**
 * Replace a note's `note_tags` rows with the given (already-derived) tag names.
 * Canonical resolution MUST run before DELETE - it reads existing rows to
 * preserve casing.
 */
export async function setNoteTags(
	db: Database,
	noteId: string,
	rawNames: string[]
): Promise<void> {
	const names = rawNames.length > 0 ? await resolveCanonicalTags(db, rawNames) : [];
	await deleteNoteTags(db, noteId);
	if (names.length > 0) await insertNoteTags(db, noteId, names);
}

export interface TagCooccurrenceRow {
	tag_a: string;
	tag_b: string;
	count: number;
}

export async function queryTagCooccurrences(db: Database): Promise<TagCooccurrenceRow[]> {
	return db.select<TagCooccurrenceRow[]>(`
      SELECT a.tag AS tag_a, b.tag AS tag_b, COUNT(*) AS count
      FROM note_tags a
      JOIN note_tags b ON a.note_id = b.note_id AND LOWER(a.tag) < LOWER(b.tag)
      JOIN notes n ON n.id = a.note_id
      WHERE n.archived = 0
      GROUP BY LOWER(a.tag), LOWER(b.tag)
    `);
}

export async function queryRelatedTags(
	db: Database,
	allCurrentTags: string[]
): Promise<RelatedTag[]> {
	if (allCurrentTags.length === 0) {
		return db.select<RelatedTag[]>(
			`SELECT t.tag, ts.color, ts.display_name
       FROM tags t
       LEFT JOIN tag_settings ts ON LOWER(ts.tag) = LOWER(t.tag)
       ORDER BY t.tag`
		);
	}

	const excludeClauses = allCurrentTags
		.map((_, i) => `LOWER(nt.tag) != LOWER($${i + 1})`)
		.join(' AND ');

	const existsClauses = allCurrentTags
		.map(
			(_, i) =>
				`AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = nt.note_id AND LOWER(tag) = LOWER($${i + 1}))`
		)
		.join('\n     ');

	return db.select<RelatedTag[]>(
		`SELECT DISTINCT nt.tag, ts.color, ts.display_name
     FROM note_tags nt
     LEFT JOIN tag_settings ts ON LOWER(ts.tag) = LOWER(nt.tag)
     WHERE ${excludeClauses}
     ${existsClauses}
     ORDER BY nt.tag`,
		allCurrentTags
	);
}
