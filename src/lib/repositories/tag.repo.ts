import { getDb } from './backend/db';
import type { Tag, RelatedTag } from '$lib/domain/tag';

// Data access for tags. Every method reaches the shared connection through
// `getDb()` internally and maps rows to finished domain objects; SQL lives only
// here. Methods are use-case-grained so the deferred Rust plan can swap a body
// for a single `invoke` with no change above this layer.

interface RawTagRow {
	tag: string;
	color: string | null;
	display_name: string | null;
	pinned: number;
	count: number;
}

export interface TagCooccurrence {
	tagA: string;
	tagB: string;
	/** Notes carrying both tags. */
	count: number;
	/** Each tag's own note count over the same (non-archived) population. */
	countA: number;
	countB: number;
}

interface RawCooccurrenceRow {
	tag_a: string;
	tag_b: string;
	count: number;
	count_a: number;
	count_b: number;
}

export const tagRepo = {
	async withCounts(): Promise<Tag[]> {
		// Counts come straight from `note_tags` (one GROUP BY over `idx_note_tags_tag`),
		// not via the `tags` view + a `LOWER()`-wrapped self-join, which defeated the
		// index and re-materialised the view's DISTINCT on every call. Tag casing is
		// canonicalised on every write path (`setNoteTags` here, `set_note_tags` in the
		// Rust sync import), so grouping on the raw `tag` is equivalent to the old
		// case-insensitive join.
		const rows = await getDb().select<RawTagRow[]>(`
      SELECT nt.tag, ts.color, ts.display_name, COALESCE(ts.pinned, 0) AS pinned, COUNT(*) AS count
      FROM note_tags nt
      LEFT JOIN tag_settings ts ON ts.tag = nt.tag
      GROUP BY nt.tag
      ORDER BY COALESCE(ts.pinned, 0) DESC, nt.tag COLLATE NOCASE
    `);
		return rows.map((r) => ({
			tag: r.tag,
			color: r.color,
			display_name: r.display_name,
			pinned: r.pinned === 1,
			count: r.count
		}));
	},

	async untaggedCount(): Promise<number> {
		const rows = await getDb().select<{ count: number }[]>(
			`SELECT COUNT(*) AS count FROM notes WHERE NOT EXISTS (SELECT 1 FROM note_tags WHERE note_id = notes.id)`
		);
		return rows[0]?.count ?? 0;
	},

	async related(tags: string[]): Promise<RelatedTag[]> {
		const db = getDb();
		if (tags.length === 0) {
			return db.select<RelatedTag[]>(
				`SELECT t.tag, ts.color, ts.display_name
       FROM tags t
       LEFT JOIN tag_settings ts ON LOWER(ts.tag) = LOWER(t.tag)
       ORDER BY t.tag`
			);
		}

		const excludeClauses = tags.map((_, i) => `LOWER(nt.tag) != LOWER($${i + 1})`).join(' AND ');
		const existsClauses = tags
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
			tags
		);
	},

	async setSettings(
		tag: string,
		settings: Partial<{ color: string; display_name: string | null; pinned: boolean }>
	): Promise<void> {
		const pinnedVal = settings.pinned == null ? null : settings.pinned ? 1 : 0;
		await getDb().execute(
			`INSERT INTO tag_settings (tag, color, display_name, pinned)
       VALUES ($1, COALESCE($2, '#7F77DD'), $3, COALESCE($4, 0))
       ON CONFLICT(tag) DO UPDATE SET
         color        = COALESCE($2, color),
         display_name = $3,
         pinned       = COALESCE($4, pinned)`,
			[tag, settings.color ?? null, settings.display_name ?? null, pinnedVal]
		);
	},

	async cooccurrences(): Promise<TagCooccurrence[]> {
		// `count` is the shared-note count for the pair; `count_a` / `count_b` are
		// each tag's own note count over the same (non-archived) population, so the
		// caller can compute a Jaccard overlap without a second round trip.
		const rows = await getDb().select<RawCooccurrenceRow[]>(`
      WITH marginals AS (
        SELECT LOWER(nt.tag) AS tag, COUNT(*) AS count
        FROM note_tags nt
        JOIN notes n ON n.id = nt.note_id AND n.archived = 0
        GROUP BY LOWER(nt.tag)
      )
      SELECT a.tag AS tag_a, b.tag AS tag_b, COUNT(*) AS count,
             ma.count AS count_a, mb.count AS count_b
      FROM note_tags a
      JOIN note_tags b ON a.note_id = b.note_id AND LOWER(a.tag) < LOWER(b.tag)
      JOIN notes n ON n.id = a.note_id AND n.archived = 0
      JOIN marginals ma ON ma.tag = LOWER(a.tag)
      JOIN marginals mb ON mb.tag = LOWER(b.tag)
      GROUP BY LOWER(a.tag), LOWER(b.tag)
    `);
		return rows.map((r) => ({
			tagA: r.tag_a,
			tagB: r.tag_b,
			count: r.count,
			countA: r.count_a,
			countB: r.count_b
		}));
	}
};
