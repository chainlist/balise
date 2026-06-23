import { fsService } from '$lib/repositories/backend/fs';

function extFromMime(mimeType: string): string {
	return (mimeType.split('/')[1] ?? 'png').replace(/\+.*$/, '');
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

	/** Persist a pasted/dropped image under `attachments/` and return its filename. */
	async saveAttachment(blob: Blob): Promise<string> {
		const ext = extFromMime(blob.type);
		const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
		await fsService.mkdir('attachments');
		const buffer = await blob.arrayBuffer();
		await fsService.writeFile(`attachments/${filename}`, new Uint8Array(buffer));
		return filename;
	}
}

export const assetsService = new AssetsService();
