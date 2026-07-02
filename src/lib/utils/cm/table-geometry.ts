// Pure hit-testing helpers for the table widget's hover controls (MdTable.svelte).

/** Index of the last `starts` entry at or before `coord` (0 when none are). */
export function indexAtOrBefore(starts: number[], coord: number): number {
	let idx = 0;
	for (let i = 0; i < starts.length; i++) {
		if (coord >= starts[i]) idx = i;
		else break;
	}
	return idx;
}

/** Nearest of `edges` within `snap` px of `coord`, or null when none is close. */
export function nearestEdge(
	edges: number[],
	coord: number,
	snap: number
): { index: number; edge: number } | null {
	let best: { index: number; edge: number } | null = null;
	let bestDist = snap + 1;
	for (let i = 0; i < edges.length; i++) {
		const d = Math.abs(coord - edges[i]);
		if (d < bestDist) {
			bestDist = d;
			best = { index: i, edge: edges[i] };
		}
	}
	return best;
}
