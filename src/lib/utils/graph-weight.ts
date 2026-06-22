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
