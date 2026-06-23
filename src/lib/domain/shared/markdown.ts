/** Leading ATX heading marker (`#` … `######`) plus its trailing space(s). */
const HEADING_PREFIX_RE = /^#{1,6}\s+/;

/** First non-empty line, with any leading heading marker stripped. */
export function extractTitle(content: string): string {
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (trimmed) return trimmed.replace(HEADING_PREFIX_RE, '').trim();
	}
	return '';
}

/** Up to 140 characters of body text that follows the title. */
export function notePreview(content: string): string {
	const title = extractTitle(content);
	const rest = title ? content.slice(content.indexOf(title) + title.length) : content;
	return rest.trim().slice(0, 140);
}
