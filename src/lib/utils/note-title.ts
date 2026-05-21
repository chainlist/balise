export function extractTitle(content: string): string {
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (trimmed) return trimmed.replace(/^#{1,6}\s+/, '').trim();
	}
	return '';
}
