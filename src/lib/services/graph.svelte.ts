import { tagRepo } from '$lib/repositories/tag.repo';
import { tagsService } from '$lib/services/tags.svelte';
import {
	buildScores,
	buildNeighbors,
	rankTags,
	weightedEdges as computeWeightedEdges,
	neighborsOf as selectNeighbors,
	type TagCooccurrence,
	type TagNeighbor
} from '$lib/domain/graph';

// Application layer: holds the loaded co-occurrence rows in `$state` and exposes
// `$derived` one-liners that delegate to the pure domain builders, run against
// `tagsService.tags`. No rules, no SQL, no Svelte logic beyond the wiring.
class GraphService {
	cooccurrences = $state<TagCooccurrence[]>([]);

	async load(): Promise<void> {
		if (tagsService.tags.length === 0) await tagsService.load();
		this.cooccurrences = await tagRepo.cooccurrences();
	}

	private readonly scores = $derived(buildScores(tagsService.tags, this.cooccurrences));
	private readonly neighbors = $derived(buildNeighbors(tagsService.tags, this.cooccurrences));

	// All tags ordered by total co-occurrence weight (most connected first).
	readonly rankedTags = $derived(rankTags(tagsService.tags, this.scores));

	// Co-occurrence edges weighted by Jaccard overlap (0..1), for the force view.
	readonly weightedEdges = $derived(computeWeightedEdges(this.cooccurrences));

	// Tags co-occurring with `name`, strongest first, optionally filtered by a
	// minimum 0..1 Jaccard strength. `minStrength` 0 shows every connection.
	neighborsOf(name: string, minStrength = 0): TagNeighbor[] {
		return selectNeighbors(this.neighbors, name, minStrength);
	}
}

export const graphService = new GraphService();
