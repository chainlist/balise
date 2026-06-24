/** Leading ATX heading marker (`#` … `######`) plus its trailing space(s). */
const HEADING_PREFIX_RE = /^#{1,6}\s+/;

/** A line that is solely a cover image (`![cover](url)`), case-insensitive. */
const COVER_LINE_RE = /^!\[\s*cover\s*\]\([^)]*\)$/i;

/** True when a line is solely a cover image (`![cover](url)`). Used by the
 *  editor's `/cover` command to find an existing cover to replace. */
export function isCoverImageLine(line: string): boolean {
	return COVER_LINE_RE.test(line.trim());
}

/** Drop a leading cover-image line so the title and preview derive from the
 *  note's first real line of text, not the `![cover](…)` banner above it. */
function withoutLeadingCover(content: string): string {
	const lines = content.split('\n');
	let i = 0;
	while (i < lines.length && lines[i].trim() === '') i++;
	if (i < lines.length && COVER_LINE_RE.test(lines[i].trim())) return lines.slice(i + 1).join('\n');
	return content;
}

/** First non-empty line, with any leading heading marker stripped. */
export function extractTitle(content: string): string {
	for (const line of withoutLeadingCover(content).split('\n')) {
		const trimmed = line.trim();
		if (trimmed) return trimmed.replace(HEADING_PREFIX_RE, '').trim();
	}
	return '';
}

/** Up to 140 characters of body text that follows the title. */
export function notePreview(content: string): string {
	const body = withoutLeadingCover(content);
	const title = extractTitle(body);
	const rest = title ? body.slice(body.indexOf(title) + title.length) : body;
	return rest.trim().slice(0, 140);
}
