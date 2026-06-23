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

// Desk-scoped filesystem adapter: the only module importing `@tauri-apps/plugin-fs`
// for note files. Inlined here so the backend client imports only Tauri (per the
// layer audit); Concept 03 (Desks) re-homes `sanitizeDeskName` into the desk
// domain, after which this adapter will receive an already-sanitized name.
const DESKS_ROOT_DIR = 'Balise';

function sanitizeDeskName(desk: string): string {
	const sanitized = desk.trim().replace(/[\\/:*?"<>|]/g, '-');
	if (!sanitized) {
		throw new Error('Desk name cannot be empty.');
	}
	return sanitized;
}

class FsService {
	#desk = '';

	setDesk(name: string): void {
		this.#desk = sanitizeDeskName(name);
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
}

export const fsService = new FsService();
