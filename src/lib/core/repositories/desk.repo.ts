import { BaseDirectory, exists, mkdir, readDir, remove, rename } from '@tauri-apps/plugin-fs';
import { documentDir, join } from '@tauri-apps/api/path';
import { loadDb, closeDbIfMatches } from './backend/db';
import { fsService, DESKS_ROOT_DIR } from './backend/fs';
import { sanitizeDeskName, isAppDataFolder } from '$lib/core/domain/desk';

// Data access for desks: a desk is a folder under Documents/Balise/<name> with its
// own SQLite DB, and this layer hides both. It opens/closes the shared connection
// through the backend `db` client and does folder IO via `@tauri-apps/plugin-fs`
// directly — this repo and `backend/fs` are the two filesystem chokepoints. Name
// rules come from the desk domain; no business logic lives here.

async function ensureDeskFolder(desk: string): Promise<string> {
	const safeDesk = sanitizeDeskName(desk);
	await mkdir(`${DESKS_ROOT_DIR}/${safeDesk}`, {
		baseDir: BaseDirectory.Document,
		recursive: true
	});
	return safeDesk;
}

async function removeIfExists(
	path: string,
	baseDir: BaseDirectory,
	recursive = false
): Promise<void> {
	const present = await exists(path, { baseDir });
	if (!present) return;

	await remove(path, { baseDir, recursive });
}

export const deskRepo = {
	/** Absolute path of the desks root (Documents/Balise), for display in the UI. */
	async getBaseDir(): Promise<string> {
		return join(await documentDir(), DESKS_ROOT_DIR);
	},

	/**
	 * Make `desk` the active data source: ensure its folder exists, open (or reuse)
	 * its DB connection, and point the note-file adapter at it. `force` reopens the
	 * shared pool even for the same desk (the quick-capture resync needs this).
	 */
	async open(desk: string, options?: { force?: boolean }): Promise<void> {
		const safeDesk = await ensureDeskFolder(desk);
		await loadDb(safeDesk, options);
		fsService.setDesk(safeDesk);
	},

	/**
	 * Every desk that exists on disk, by folder name. Desks *are* folders, so the
	 * `Balise/` subdirectories are the source of truth. Empty if the root is absent.
	 * Dot-prefixed entries (e.g. the `.balise` settings folder) are app data, not
	 * desks, so they're skipped.
	 */
	async list(): Promise<string[]> {
		try {
			const entries = await readDir(DESKS_ROOT_DIR, { baseDir: BaseDirectory.Document });
			return entries.filter((e) => e.isDirectory && !isAppDataFolder(e.name)).map((e) => e.name);
		} catch {
			return [];
		}
	},

	/**
	 * Rename a desk's folder and all of its DB files (incl. WAL/SHM/journal) across
	 * both the Documents and AppData locations, closing the connection first.
	 */
	async rename(oldDesk: string, newDesk: string): Promise<void> {
		const oldSafe = sanitizeDeskName(oldDesk);
		const newSafe = sanitizeDeskName(newDesk);

		await closeDbIfMatches(oldSafe);

		for (const baseDir of [BaseDirectory.Document, BaseDirectory.AppData]) {
			for (const ext of ['', '-wal', '-shm', '-journal']) {
				const oldFile = `${oldSafe}.db${ext}`;
				const newFile = `${newSafe}.db${ext}`;
				const present = await exists(oldFile, { baseDir });
				if (present) {
					await rename(oldFile, newFile, { oldPathBaseDir: baseDir, newPathBaseDir: baseDir });
				}

				const oldNested = `${DESKS_ROOT_DIR}/${oldSafe}/${oldSafe}.db${ext}`;
				const newNested = `${DESKS_ROOT_DIR}/${newSafe}/${newSafe}.db${ext}`;
				const nestedPresent = await exists(oldNested, { baseDir });
				if (nestedPresent) {
					await rename(oldNested, newNested, { oldPathBaseDir: baseDir, newPathBaseDir: baseDir });
				}
			}
		}

		const oldFolder = `${DESKS_ROOT_DIR}/${oldSafe}`;
		const newFolder = `${DESKS_ROOT_DIR}/${newSafe}`;
		const folderPresent = await exists(oldFolder, { baseDir: BaseDirectory.Document });
		if (folderPresent) {
			await rename(oldFolder, newFolder, {
				oldPathBaseDir: BaseDirectory.Document,
				newPathBaseDir: BaseDirectory.Document
			});
		}
	},

	/**
	 * Delete a desk's DB files and folder across both locations, closing the
	 * connection first.
	 */
	async delete(desk: string): Promise<void> {
		const safeDesk = sanitizeDeskName(desk);
		await closeDbIfMatches(safeDesk);

		const dbFiles = [
			`${safeDesk}.db`,
			`${safeDesk}.db-wal`,
			`${safeDesk}.db-shm`,
			`${safeDesk}.db-journal`,
			`${DESKS_ROOT_DIR}/${safeDesk}/${safeDesk}.db`,
			`${DESKS_ROOT_DIR}/${safeDesk}/${safeDesk}.db-wal`,
			`${DESKS_ROOT_DIR}/${safeDesk}/${safeDesk}.db-shm`,
			`${DESKS_ROOT_DIR}/${safeDesk}/${safeDesk}.db-journal`
		];

		for (const baseDir of [BaseDirectory.Document, BaseDirectory.AppData]) {
			for (const dbFile of dbFiles) {
				await removeIfExists(dbFile, baseDir);
			}

			await removeIfExists(`${DESKS_ROOT_DIR}/${safeDesk}`, baseDir, true);
		}
	}
};
