import { HEADING_PREFIX_RE, IMAGE_SOURCE } from './markdown-patterns';

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

const WORDS_PER_MINUTE = 220;
const SECONDS_PER_IMAGE = 10;
const IMAGE_RE = new RegExp(IMAGE_SOURCE, 'g');

export function readingTimeMinutes(content: string): number {
	const images = content.match(IMAGE_RE)?.length ?? 0;
	const text = images ? content.replace(IMAGE_RE, ' ') : content;
	const words = text.split(/\s+/).filter(Boolean).length;
	if (!words && !images) return 0;
	const seconds = (words / WORDS_PER_MINUTE) * 60 + images * SECONDS_PER_IMAGE;
	return Math.max(1, Math.round(seconds / 60));
}
