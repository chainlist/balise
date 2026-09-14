import { fsService } from '$lib/repositories/backend/fs';
import { openImageFile } from '$lib/repositories/backend/dialog';
import { copyAttachment } from '$lib/repositories/backend/tauri';
import { httpClient } from './system/http';

function extFromMime(mimeType: string): string {
	return (mimeType.split('/')[1] ?? 'png').replace(/\+.*$/, '');
}

function extFromPath(path: string): string {
	const base = path.split(/[\\/]/).pop() ?? '';
	const dot = base.lastIndexOf('.');
	return dot > 0 ? base.slice(dot + 1).toLowerCase() : 'png';
}

// Application seam for desk-local binary assets (embedded note images). The import
// matrix forbids presentation from reaching the backend fs client directly, so this
// thin service exposes the reads/writes the markdown preview and editor embed
// plugin need. It mirrors how the store-backed services reach `backend/store`.
class AssetsService {
	/** Read a desk-relative file as bytes (e.g. an embedded image referenced by a note). */
	readImage(path: string): Promise<Uint8Array> {
		return fsService.readFile(path);
	}

	/** Fetch a remote image as bytes. The export rasteriser reads an image back to
	 *  inline it, which a cross-origin <img> the webview loaded does not allow, so
	 *  the request goes out over the Rust-side HTTP client instead. */
	readRemoteImage(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
		return httpClient.fetchBytes(url);
	}

	/** Persist a pasted/dropped image under `attachments/` and return its filename. */
	async saveAttachment(blob: Blob): Promise<string> {
		const ext = extFromMime(blob.type);
		const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
		await fsService.mkdir('attachments');
		const buffer = await blob.arrayBuffer();
		await fsService.writeFile(`attachments/${filename}`, new Uint8Array(buffer));
		return filename;
	}

	/** Open the native file picker, copy the chosen image into `attachments/`,
	 *  and return its filename. null when the user cancels the dialog. */
	async pickAndImportImage(): Promise<string | null> {
		const srcPath = await openImageFile();
		if (!srcPath) return null;
		const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${extFromPath(srcPath)}`;
		await copyAttachment(fsService.currentDesk, srcPath, filename);
		return filename;
	}
}

export const assetsService = new AssetsService();
