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
import { DESKS_ROOT_DIR, sanitizeDeskName } from './desk';

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
