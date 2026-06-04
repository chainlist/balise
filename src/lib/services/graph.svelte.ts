import { getDB } from '$lib/utils/db';
import { queryTagCooccurrences } from '$lib/repositories/tags.repo';
import { tagsService } from '$lib/services/tags.svelte';
import type { Tag } from '$lib/models/tag';

export interface TagCooccurrence {
	a: string;
	b: string;
	count: number;
}

export interface TagNeighbor {
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
		this.cooccurrences = rows.map((r) => ({ a: r.tag_a, b: r.tag_b, count: r.count }));
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

	// All tags ordered by total co-occurrence weight (most connected first).
	readonly rankedTags = $derived.by(() =>
		[...tagsService.tags].sort((x, y) => {
			const d = (this.scores[y.tag.toLowerCase()] ?? 0) - (this.scores[x.tag.toLowerCase()] ?? 0);
			return d !== 0 ? d : x.tag.localeCompare(y.tag, undefined, { sensitivity: 'base' });
		})
	);

	// Highest single co-occurrence count (drives the "min connections" slider range).
	readonly maxWeight = $derived(this.cooccurrences.reduce((mx, c) => Math.max(mx, c.count), 1));

	// Tags co-occurring with `name`, above `minWeight`, strongest first.
	neighborsOf(name: string, minWeight = 1): TagNeighbor[] {
		const lower = name.toLowerCase();
		const out: TagNeighbor[] = [];
		for (const c of this.cooccurrences) {
			if (c.count < minWeight) continue;
			const a = c.a.toLowerCase();
			const b = c.b.toLowerCase();
			const partner = a === lower ? b : b === lower ? a : null;
			if (!partner) continue;
			const tag = this.byLower[partner];
			if (tag) out.push({ tag, weight: c.count });
		}
		return out.sort((x, y) => y.weight - x.weight);
	}
}

export const graphService = new GraphService();
