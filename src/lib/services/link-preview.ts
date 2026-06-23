import { linkPreviewHttp } from './system/link-preview';

export interface LinkPreview {
	url: string;
	domain: string;
	title: string;
	description: string;
	image: string | null;
	favicon: string | null;
}

function domainOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}

function absolute(href: string | null | undefined, base: string): string | null {
	if (!href) return null;
	try {
		return new URL(href, base).href;
	} catch {
		return null;
	}
}

// Extract Open Graph / fallback metadata from an HTML document. Pure: takes the
// raw HTML and the source URL (to resolve relative image/favicon paths).
export function parseOpenGraph(html: string, url: string): LinkPreview {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	const meta = (selector: string): string =>
		doc.querySelector(selector)?.getAttribute('content')?.trim() ?? '';

	const domain = domainOf(url);
	const title =
		meta('meta[property="og:title"]') ||
		meta('meta[name="twitter:title"]') ||
		doc.querySelector('title')?.textContent?.trim() ||
		domain;
	const description =
		meta('meta[property="og:description"]') ||
		meta('meta[name="twitter:description"]') ||
		meta('meta[name="description"]');
	const image = absolute(
		meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]'),
		url
	);
	const iconHref = doc.querySelector('link[rel~="icon"]')?.getAttribute('href') ?? '/favicon.ico';
	const favicon = absolute(iconHref, url);

	return { url, domain, title, description, image, favicon };
}

// Application layer: memoizes link previews per URL. The network call lives in the
// `linkPreviewHttp` OS wrapper; the HTML→metadata parsing is the pure
// `parseOpenGraph` above. The in-flight promise is cached so concurrent widgets
// share one request; failures are evicted so a remount can retry.
class LinkPreviewService {
	#cache = new Map<string, Promise<LinkPreview>>();

	preview(url: string): Promise<LinkPreview> {
		const cached = this.#cache.get(url);
		if (cached) return cached;
		const promise = this.#fetch(url).catch((e) => {
			this.#cache.delete(url);
			throw e;
		});
		this.#cache.set(url, promise);
		return promise;
	}

	async #fetch(url: string): Promise<LinkPreview> {
		const html = await linkPreviewHttp.fetchHtml(url);
		return parseOpenGraph(html, url);
	}
}

export const linkPreviewService = new LinkPreviewService();
