// Pure hit-testing helper for the table widget's hover controls (MdTable.svelte).

/** Index of the last `starts` entry at or before `coord`, or -1 when `coord` is before all of them. */
export function indexAtOrBefore(starts: number[], coord: number): number {
	let idx = -1;
	for (let i = 0; i < starts.length; i++) {
		if (coord >= starts[i]) idx = i;
		else break;
	}
	return idx;
}
