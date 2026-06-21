// Embed registry: matchers + transforms for known embeddable hosts. Kept pure
// (no Svelte/CodeMirror imports) so the matching logic stays unit-testable.
// EmbedViewer maps each `kind` to the component that renders it.

export type EmbedKind = 'video';

export interface EmbedDef {
	readonly name: string;
	readonly kind: EmbedKind;
	// Tested against the raw URL. The first capture group is the resource id.
	readonly match: RegExp;
	// Builds the iframe `src` from a successful match.
	readonly transform: (match: RegExpMatchArray) => string;
}

export interface EmbedMatch {
	readonly def: EmbedDef;
	readonly match: RegExpMatchArray;
	readonly src: string;
}

// Known video hosts and their iframe embed URLs.
export const EMBEDS: readonly EmbedDef[] = [
	{
		name: 'youtube',
		kind: 'video',
		match: /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
		transform: (m) => `https://www.youtube.com/embed/${m[1]}`
	},
	{
		name: 'vimeo',
		kind: 'video',
		match: /(?:player\.vimeo\.com\/video\/|vimeo\.com\/(?:video\/)?)(\d+)/,
		transform: (m) => `https://player.vimeo.com/video/${m[1]}`
	},
	{
		name: 'dailymotion',
		kind: 'video',
		match: /(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/,
		transform: (m) => `https://www.dailymotion.com/embed/video/${m[1]}`
	}
];

// First embed definition matching a URL, with its capture groups and the
// resolved iframe src. Returns null for URLs that aren't a known embed host.
export function matchEmbed(url: string): EmbedMatch | null {
	for (const def of EMBEDS) {
		const match = url.match(def.match);
		if (match) return { def, match, src: def.transform(match) };
	}
	return null;
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)(\?.*)?$/i;

// Since every embed is now `![…](url)`, the embed kind is inferred from the URL,
// not the markdown syntax. A URL is an image when it's a local/relative path (we
// only ever save image attachments) or an http(s)/data URL with an image type.
// Anything else (a non-image http URL) renders as a link card.
export function isImageUrl(url: string): boolean {
	if (url.startsWith('data:')) return url.startsWith('data:image/');
	if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return true;
	return IMAGE_EXT_RE.test(url);
}
