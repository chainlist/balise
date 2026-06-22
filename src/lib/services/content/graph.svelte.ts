import { getDB } from '$lib/utils/db';
import { queryTagCooccurrences } from '$lib/repositories/tags.repo';
import { tagsService } from '$lib/services/content/tags.svelte';
import { jaccardWeight } from '$lib/utils/graph-weight';
import type { Tag } from '$lib/models/tag';

interface TagCooccurrence {
	a: string;
	b: string;
	count: number;
	countA: number;
	countB: number;
}

interface TagNeighbor {
	tag: Tag;
	weight: number;
}

/**
 * Owns the tag co-occurrence graph: loads the raw pairs and derives the
 * scoring, neighbour, and drill-down structures the graph view needs.
 * Depends on `tagsService` for the underlying tags (colors, counts, names).
 */
class GraphService {
	cooccurrences = $state<TagCooccurrence[]>([]);

	async load(): Promise<void> {
		if (tagsService.tags.length === 0) await tagsService.load();
		const rows = await queryTagCooccurrences(getDB());
		this.cooccurrences = rows.map((r) => ({
			a: r.tag_a,
			b: r.tag_b,
			count: r.count,
			countA: r.count_a,
			countB: r.count_b
		}));
	}

	private readonly byLower = $derived.by(() => {
		const map: Record<string, Tag> = {};
		for (const t of tagsService.tags) map[t.tag.toLowerCase()] = t;
		return map;
	});

	// Total co-occurrence weight per tag, keyed by lowercase name.
	private readonly scores = $derived.by(() => {
		const score: Record<string, number> = {};
		for (const t of tagsService.tags) score[t.tag.toLowerCase()] = 0;
		for (const c of this.cooccurrences) {
			const a = c.a.toLowerCase();
			const b = c.b.toLowerCase();
			if (a in score) score[a] += c.count;
			if (b in score) score[b] += c.count;
		}
		return score;
	});

	// Pre-built adjacency index: tag (lowercase) -> sorted neighbor list.
	private readonly neighborsByTag = $derived.by(() => {
		const map: Record<string, TagNeighbor[]> = {};
		for (const c of this.cooccurrences) {
			const a = c.a.toLowerCase();
			const b = c.b.toLowerCase();
			const tagA = this.byLower[a];
			const tagB = this.byLower[b];
			if (tagA && tagB) {
				const weight = jaccardWeight(c.countA, c.countB, c.count);
				(map[a] ??= []).push({ tag: tagB, weight });
				(map[b] ??= []).push({ tag: tagA, weight });
			}
		}
		for (const key in map) map[key].sort((x, y) => y.weight - x.weight);
		return map;
	});

	// All tags ordered by total co-occurrence weight (most connected first).
	readonly rankedTags = $derived.by(() =>
		[...tagsService.tags].sort((x, y) => {
			const d = (this.scores[y.tag.toLowerCase()] ?? 0) - (this.scores[x.tag.toLowerCase()] ?? 0);
			return d !== 0 ? d : x.tag.localeCompare(y.tag, undefined, { sensitivity: 'base' });
		})
	);

	// Co-occurrence edges weighted by Jaccard overlap (0..1), for the force view.
	readonly weightedEdges = $derived(
		this.cooccurrences.map((c) => ({
			a: c.a,
			b: c.b,
			weight: jaccardWeight(c.countA, c.countB, c.count)
		}))
	);

	// Tags co-occurring with `name`, strongest first, optionally filtered by a
	// minimum 0..1 Jaccard strength. `minStrength` 0 shows every connection.
	neighborsOf(name: string, minStrength = 0): TagNeighbor[] {
		const neighbors = this.neighborsByTag[name.toLowerCase()] ?? [];
		return minStrength <= 0 ? neighbors : neighbors.filter((n) => n.weight >= minStrength);
	}
}

export const graphService = new GraphService();
