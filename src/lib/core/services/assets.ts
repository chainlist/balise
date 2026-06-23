import { fsService } from '$lib/core/repositories/backend/fs';

// Application read-seam for desk-local binary assets (embedded note images). The
// import matrix forbids presentation from reaching the backend fs client directly,
// so this thin service exposes the single read the markdown preview / embed viewer
// need. It mirrors how the store-backed services reach `backend/store`.
class AssetsService {
	/** Read a desk-relative file as bytes (e.g. an embedded image referenced by a note). */
	readImage(path: string): Promise<Uint8Array> {
		return fsService.readFile(path);
	}
}

export const assetsService = new AssetsService();
