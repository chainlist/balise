import { fetch } from '@tauri-apps/plugin-http';

// OS wrapper: binary GETs over the Tauri HTTP plugin. Like `linkPreviewHttp`
// next to it, the request is issued from the Rust side, so a response the webview
// could not read for want of CORS headers still comes back. The export rasteriser
// needs the bytes themselves: a cross-origin image the webview merely displayed
// cannot be read back into a canvas.
export const httpClient = {
	/** Fetch a resource as bytes plus the MIME type the server reported. */
	async fetchBytes(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
		const res = await fetch(url, { method: 'GET' });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const buffer = await res.arrayBuffer();
		return { bytes: new Uint8Array(buffer), mime: res.headers.get('content-type') ?? '' };
	}
};
