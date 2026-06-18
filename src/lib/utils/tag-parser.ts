export const TAG_PATTERN_SOURCE = String.raw`#([a-zA-Z0-9/]{2,})(?:\(([^)]+)\))?`;

export interface ParsedHashtag {
	name: string;
	param: string | undefined;
}

export interface HashtagMatch extends ParsedHashtag {
	index: number;
	length: number;
}

export function parseAllHashtags(text: string): HashtagMatch[] {
	const re = new RegExp(TAG_PATTERN_SOURCE, 'g');
	const results: HashtagMatch[] = [];
	for (const match of text.matchAll(re)) {
		results.push({
			name: match[1],
			param: match[2],
			index: match.index,
			length: match[0].length
		});
	}
	return results;
}

export interface TagOccurrences {
	name: string;
	/** Document offsets of every occurrence, in document order. */
	positions: number[];
}

/**
 * Group every hashtag in `text` by name (case-insensitive, first-seen casing
 * kept for display), in order of first appearance. Each group lists the offsets
 * of all its occurrences so the editor header can cycle through them.
 */
export function groupHashtagOccurrences(text: string): TagOccurrences[] {
	const groups = new Map<string, TagOccurrences>();
	for (const { name, index } of parseAllHashtags(text)) {
		const key = name.toLowerCase();
		const existing = groups.get(key);
		if (existing) existing.positions.push(index);
		else groups.set(key, { name, positions: [index] });
	}
	return [...groups.values()];
}
