import { fetch } from '@tauri-apps/plugin-http';

// OS wrapper: the one place the link-preview feature reaches the network. The
// Tauri HTTP plugin issues the request from the Rust side (so it is not subject to
// CORS); this isolates that Tauri import from the app-shell `linkPreviewService`,
// which keeps the cache and the HTML parsing.
export const linkPreviewHttp = {
	/** Fetch a page's raw HTML over the Tauri HTTP plugin. */
	async fetchHtml(url: string): Promise<string> {
		const res = await fetch(url, { method: 'GET', headers: { Accept: 'text/html' } });
		return res.text();
	}
};
