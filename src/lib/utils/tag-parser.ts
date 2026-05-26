export const TAG_PATTERN_SOURCE = String.raw`#([a-zA-Z0-9/]{2,})(?:\(([^)]+)\))?`;

export interface ParsedHashtag {
	name: string;
	param: string | undefined;
}

export interface HashtagMatch extends ParsedHashtag {
	index: number;
	length: number;
}

const HASHTAG_RE = new RegExp(`^${TAG_PATTERN_SOURCE}$`);

export function parseHashtag(text: string): ParsedHashtag | null {
	const match = HASHTAG_RE.exec(text);
	if (!match) return null;
	return { name: match[1], param: match[2] };
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
