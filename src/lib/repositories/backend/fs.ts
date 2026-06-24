import {
	BaseDirectory,
	readFile as fsReadFile,
	readTextFile as fsReadTextFile,
	writeFile as fsWriteFile,
	writeTextFile as fsWriteTextFile,
	mkdir as fsMkdir,
	remove as fsRemove,
	exists as fsExists,
	readDir as fsReadDir,
	stat as fsStat
} from '@tauri-apps/plugin-fs';
import { documentDir, join } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';

// Desk-scoped filesystem adapter: the only module importing `@tauri-apps/plugin-fs`
// for note files. `DESKS_ROOT_DIR` is the single storage-root detail shared by the
// other backend modules (the store path) and the desk repository (folder ops), so
// it's exported from here rather than duplicated — it's a data-access detail, not a
// domain rule. Desk-name sanitization is a domain rule (`core/domain/desk`) applied
// by the desk repository before `setDesk`, so this adapter receives an already-safe name.
export const DESKS_ROOT_DIR = 'Balise';

class FsService {
	#desk = '';

	setDesk(name: string): void {
		this.#desk = name;
	}

	get currentDesk(): string {
		return this.#desk;
	}

	#resolve(path: string): string {
		const base = `${DESKS_ROOT_DIR}/${this.#desk}`;
		return path ? `${base}/${path}` : base;
	}

	async readFile(path: string) {
		return fsReadFile(this.#resolve(path), { baseDir: BaseDirectory.Document });
	}

	async readTextFile(path: string) {
		return fsReadTextFile(this.#resolve(path), { baseDir: BaseDirectory.Document });
	}

	async writeFile(path: string, data: Uint8Array) {
		await fsWriteFile(this.#resolve(path), data, { baseDir: BaseDirectory.Document });
	}

	async writeTextFile(path: string, text: string) {
		await fsWriteTextFile(this.#resolve(path), text, { baseDir: BaseDirectory.Document });
	}

	async mkdir(path: string) {
		await fsMkdir(this.#resolve(path), { baseDir: BaseDirectory.Document, recursive: true });
	}

	async remove(path: string) {
		await fsRemove(this.#resolve(path), { baseDir: BaseDirectory.Document });
	}

	async exists(path: string) {
		return fsExists(this.#resolve(path), { baseDir: BaseDirectory.Document });
	}

	async readDir(path = '') {
		return fsReadDir(this.#resolve(path), { baseDir: BaseDirectory.Document });
	}

	async stat(path: string) {
		return fsStat(this.#resolve(path), { baseDir: BaseDirectory.Document });
	}

	/** Open a desk file in the OS default application for its file type. */
	async openInDefaultApp(path: string) {
		await openPath(await join(await documentDir(), DESKS_ROOT_DIR, this.#desk, path));
	}
}

export const fsService = new FsService();
