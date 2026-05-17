import { getDB } from '$lib/utils/db';
import { SvelteSet } from 'svelte/reactivity';

export interface Tag {
	tag: string;
	color: string | null;
	display_name: string | null;
	pinned: boolean;
	count: number;
}

export interface RelatedTag {
	tag: string;
	color: string | null;
	display_name: string | null;
}

export const tagState = $state({ tags: [] as Tag[], untaggedCount: 0, relatedTags: [] as RelatedTag[] });

export async function loadTags(): Promise<void> {
	const db = getDB();
	type RawTag = Omit<Tag, 'pinned'> & { pinned: number };
	const [rawTags, untagged] = await Promise.all([
		db.select<RawTag[]>(`
      SELECT t.tag, ts.color, ts.display_name, COALESCE(ts.pinned, 0) AS pinned, COUNT(nt.note_id) AS count
      FROM tags t
      LEFT JOIN note_tags nt ON LOWER(nt.tag) = LOWER(t.tag)
      LEFT JOIN tag_settings ts ON ts.tag = t.tag
      GROUP BY t.tag
      ORDER BY COALESCE(ts.pinned, 0) DESC, t.tag
    `),
		db.select<{ count: number }[]>(
			`SELECT COUNT(*) AS count FROM notes WHERE id NOT IN (SELECT DISTINCT note_id FROM note_tags)`
		)
	]);
	tagState.tags = rawTags.map((t) => ({ ...t, pinned: t.pinned === 1 }));
	tagState.untaggedCount = untagged[0]?.count ?? 0;
}

export async function setTagSettings(
	tag: string,
	settings: Partial<{ color: string; display_name: string | null; pinned: boolean }>
): Promise<void> {
	const db = getDB();
	const pinnedVal = settings.pinned !== undefined ? (settings.pinned ? 1 : 0) : null;
	await db.execute(
		`INSERT INTO tag_settings (tag, color, display_name, pinned)
       VALUES ($1, COALESCE($2, '#7F77DD'), $3, COALESCE($4, 0))
       ON CONFLICT(tag) DO UPDATE SET
         color        = COALESCE($2, color),
         display_name = $3,
         pinned       = COALESCE($4, pinned)`,
		[tag, settings.color ?? null, settings.display_name ?? null, pinnedVal]
	);
	const updated = tagState.tags.find((t) => t.tag === tag);
	if (updated) {
		if (settings.color) updated.color = settings.color;
		if (settings.display_name !== undefined) updated.display_name = settings.display_name;
		if (settings.pinned !== undefined) {
			updated.pinned = settings.pinned;
			tagState.tags.sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.tag.localeCompare(b.tag));
		}
	}
}

export function tagDisplayName(tag: { display_name: string | null; tag: string }): string {
	return tag.display_name ?? tag.tag;
}

export function extractTags(content: string): string[] {
	const tags = new SvelteSet<string>();

	for (const [match] of content.matchAll(/#[a-zA-Z0-9/]{2,}/g)) {
		tags.add(match.slice(1));
	}

	// Magic tags: infer #code and #<lang> from fenced code blocks (``` lang)
	for (const [, lang] of content.matchAll(/^```([a-zA-Z][a-zA-Z0-9]*)/gm)) {
		tags.add('code');
		tags.add(lang.toLowerCase());
	}

	return [...tags];
}

export async function loadRelatedTags(
	activeTag: string | null,
	composedTags: string[] = []
): Promise<void> {
	const db = getDB();

	if (activeTag === '__untagged__') {
		tagState.relatedTags = [];
		return;
	}

	const allCurrentTags = activeTag ? [activeTag, ...composedTags] : composedTags;

	if (allCurrentTags.length === 0) {
		tagState.relatedTags = await db.select<RelatedTag[]>(
			`SELECT t.tag, ts.color, ts.display_name
       FROM tags t
       LEFT JOIN tag_settings ts ON LOWER(ts.tag) = LOWER(t.tag)
       ORDER BY t.tag`
		);
		return;
	}

	const excludeClauses = allCurrentTags
		.map((_, i) => `LOWER(nt.tag) != LOWER($${i + 1})`)
		.join(' AND ');

	const existsClauses = allCurrentTags
		.map((_, i) => `AND EXISTS (SELECT 1 FROM note_tags WHERE note_id = nt.note_id AND LOWER(tag) = LOWER($${i + 1}))`)
		.join('\n     ');

	tagState.relatedTags = await db.select<RelatedTag[]>(
		`SELECT DISTINCT nt.tag, ts.color, ts.display_name
     FROM note_tags nt
     LEFT JOIN tag_settings ts ON LOWER(ts.tag) = LOWER(nt.tag)
     WHERE ${excludeClauses}
     ${existsClauses}
     ORDER BY nt.tag`,
		allCurrentTags
	);
}

export async function syncNoteTags(noteId: string, content: string): Promise<void> {
	const db = getDB();
	const rawNames = extractTags(content);

	if (rawNames.length === 0) {
		await db.execute('DELETE FROM note_tags WHERE note_id = $1', [noteId]);
		await loadTags();
		return;
	}

	// Resolve all canonical forms in one query (before DELETE so this note's rows are visible)
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
	const names = rows.map((r) => r.canonical);

	await db.execute('DELETE FROM note_tags WHERE note_id = $1', [noteId]);

	const insertClause = names.map((_, i) => `($1, $${i + 2})`).join(', ');
	await db.execute(`INSERT OR IGNORE INTO note_tags (note_id, tag) VALUES ${insertClause}`, [
		noteId,
		...names
	]);

	await loadTags();
}
