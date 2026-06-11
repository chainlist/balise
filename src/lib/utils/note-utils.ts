import { HEADING_PREFIX_RE } from './markdown-patterns';

export function extractTitle(content: string): string {
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (trimmed) return trimmed.replace(HEADING_PREFIX_RE, '').trim();
	}
	return '';
}

export function notePreview(content: string): string {
	const title = extractTitle(content);
	const rest = title ? content.slice(content.indexOf(title) + title.length) : content;
	return rest.trim().slice(0, 140);
}
