// Graph domain: the tag co-occurrence graph connects subjects (tags), never note
// to note. Edge weighting, per-tag scoring, ranking, neighbour adjacency, and
// colour mapping are pure rules, no I/O, no Svelte, no Tauri. The service feeds
// these builders the tags and the loaded co-occurrence rows and exposes the
// derived structures the graph views consume.

import type { Tag } from './tag';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TagCooccurrence {
	tagA: string;
	tagB: string;
	/** Notes carrying both tags. */
	count: number;
	/** Each tag's own note count over the same (non-archived) population. */
	countA: number;
	countB: number;
}

export interface TagNeighbor {
	tag: Tag;
	weight: number;
}

export interface WeightedEdge {
	a: string;
	b: string;
	weight: number;
}

// ─── Edge weighting ───────────────────────────────────────────────────────────

/**
 * Jaccard overlap between two tags: shared notes / notes carrying either tag.
 * `countAB` is the number of notes carrying both; `countA` / `countB` are each
 * tag's own note count. Returns a 0..1 strength where 1 means the two tags
 * always appear together. A tag that sits on almost everything drags the union
 * up, so its incidental co-occurrences score low - which is the whole point.
 */
export function jaccardWeight(countA: number, countB: number, countAB: number): number {
	const union = countA + countB - countAB;
	return union > 0 ? countAB / union : 0;
}

// ─── Colours ──────────────────────────────────────────────────────────────────

export const DEFAULT_TAG_COLOR = '#7F77DD';

const PALETTE_LIGHT = [
	'#7F77DD',
	'#1D9E75',
	'#D85A30',
	'#378ADD',
	'#9333EA',
	'#E0A30E',
	'#D6336C',
	'#0CA678'
];

const PALETTE_DARK = [
	'#AFA9EC',
	'#5DCAA5',
	'#F0997B',
	'#85B7EB',
	'#C084FC',
	'#F5CF5B',
	'#F06595',
	'#38D9A9'
];

export function assignGraphColors(tags: Tag[], isDark: boolean): Record<string, string> {
	const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
	const map: Record<string, string> = {};
	tags.forEach((t, i) => {
		map[t.tag.toLowerCase()] =
			t.color && t.color.toUpperCase() !== DEFAULT_TAG_COLOR.toUpperCase()
				? t.color
				: palette[i % palette.length];
	});
	return map;
}

// ─── Scoring, ranking, adjacency ────────────────────────────────────────────────

/** Total co-occurrence weight per tag, keyed by lowercase name. */
export function buildScores(tags: Tag[], cooccurrences: TagCooccurrence[]): Record<string, number> {
	const score: Record<string, number> = {};
	for (const t of tags) score[t.tag.toLowerCase()] = 0;
	for (const c of cooccurrences) {
		const a = c.tagA.toLowerCase();
		const b = c.tagB.toLowerCase();
		if (a in score) score[a] += c.count;
		if (b in score) score[b] += c.count;
	}
	return score;
}

/** Adjacency index: tag (lowercase) -> neighbour list sorted by weight, strongest first. */
export function buildNeighbors(
	tags: Tag[],
	cooccurrences: TagCooccurrence[]
): Record<string, TagNeighbor[]> {
	const byLower: Record<string, Tag> = {};
	for (const t of tags) byLower[t.tag.toLowerCase()] = t;

	const map: Record<string, TagNeighbor[]> = {};
	for (const c of cooccurrences) {
		const a = c.tagA.toLowerCase();
		const b = c.tagB.toLowerCase();
		const tagA = byLower[a];
		const tagB = byLower[b];
		if (tagA && tagB) {
			const weight = jaccardWeight(c.countA, c.countB, c.count);
			(map[a] ??= []).push({ tag: tagB, weight });
			(map[b] ??= []).push({ tag: tagA, weight });
		}
	}
	for (const key in map) map[key].sort((x, y) => y.weight - x.weight);
	return map;
}

/** All tags ordered by total co-occurrence weight (most connected first), ties by name. */
export function rankTags(tags: Tag[], scores: Record<string, number>): Tag[] {
	return [...tags].sort((x, y) => {
		const d = (scores[y.tag.toLowerCase()] ?? 0) - (scores[x.tag.toLowerCase()] ?? 0);
		return d !== 0 ? d : x.tag.localeCompare(y.tag, undefined, { sensitivity: 'base' });
	});
}

/** Co-occurrence edges weighted by Jaccard overlap (0..1), for the force view. */
export function weightedEdges(cooccurrences: TagCooccurrence[]): WeightedEdge[] {
	return cooccurrences.map((c) => ({
		a: c.tagA,
		b: c.tagB,
		weight: jaccardWeight(c.countA, c.countB, c.count)
	}));
}

/**
 * Tags co-occurring with `name`, strongest first, optionally filtered by a
 * minimum 0..1 Jaccard strength. `minStrength` 0 shows every connection.
 * Takes the prebuilt adjacency from `buildNeighbors` so the lookup stays O(1).
 */
export function neighborsOf(
	neighbors: Record<string, TagNeighbor[]>,
	name: string,
	minStrength = 0
): TagNeighbor[] {
	const list = neighbors[name.toLowerCase()] ?? [];
	return minStrength <= 0 ? list : list.filter((n) => n.weight >= minStrength);
}
