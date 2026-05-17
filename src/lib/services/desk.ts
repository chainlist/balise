import { BaseDirectory, exists, mkdir, remove } from '@tauri-apps/plugin-fs';
import type Database from '@tauri-apps/plugin-sql';
import { closeDBIfMatches, loadDB } from '$lib/utils/db';

const DESKS_ROOT_DIR = 'Balise';

export function sanitizeDeskName(desk: string): string {
	const normalized = desk.trim();
	const sanitized = normalized.replace(/[\\/:*?"<>|]/g, '-');

	if (!sanitized) {
		throw new Error('Desk name cannot be empty.');
	}

	return sanitized;
}

export async function ensureDeskFolder(desk: string): Promise<string> {
	const safeDesk = sanitizeDeskName(desk);
	await mkdir(`${DESKS_ROOT_DIR}/${safeDesk}`, {
		baseDir: BaseDirectory.Document,
		recursive: true
	});
	return safeDesk;
}

export async function openDesk(desk: string): Promise<Database> {
	const safeDesk = await ensureDeskFolder(desk);
	return loadDB(safeDesk);
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
