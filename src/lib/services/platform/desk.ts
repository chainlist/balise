import { BaseDirectory, exists, mkdir, remove, rename } from '@tauri-apps/plugin-fs';
import type Database from '@tauri-apps/plugin-sql';
import { closeDBIfMatches, loadDB } from '$lib/utils/db';
import { documentDir, join } from '@tauri-apps/api/path';

export const DESKS_ROOT_DIR = 'Balise';

export async function getBaseDir(): Promise<string> {
	return join(await documentDir(), DESKS_ROOT_DIR);
}

export function sanitizeDeskName(desk: string): string {
	const normalized = desk.trim();
	const sanitized = normalized.replace(/[\\/:*?"<>|]/g, '-');

	if (!sanitized) {
		throw new Error('Desk name cannot be empty.');
	}

	return sanitized;
}

async function ensureDeskFolder(desk: string): Promise<string> {
	const safeDesk = sanitizeDeskName(desk);
	await mkdir(`${DESKS_ROOT_DIR}/${safeDesk}`, {
		baseDir: BaseDirectory.Document,
		recursive: true
	});
	return safeDesk;
}

export async function openDesk(desk: string, options?: { force?: boolean }): Promise<Database> {
	const safeDesk = await ensureDeskFolder(desk);
	return loadDB(safeDesk, options);
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

export async function renameDeskFiles(oldDesk: string, newDesk: string): Promise<void> {
	const oldSafe = sanitizeDeskName(oldDesk);
	const newSafe = sanitizeDeskName(newDesk);

	await closeDBIfMatches(oldSafe);

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
}

export async function deleteDeskFiles(desk: string): Promise<void> {
	const safeDesk = sanitizeDeskName(desk);
	await closeDBIfMatches(safeDesk);

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
