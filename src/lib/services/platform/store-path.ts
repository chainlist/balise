import { BaseDirectory, exists, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs';
import { documentDir, join } from '@tauri-apps/api/path';
import { DESKS_ROOT_DIR } from './desk';

const STORE_SUBDIR = '.balise';

/** Store files that live under Documents/Balise/.balise. */
export const STORE_FILES = ['settings.json', 'ui-state.json'] as const;

async function storeDir(): Promise<string> {
	return join(await documentDir(), DESKS_ROOT_DIR, STORE_SUBDIR);
}

/**
 * Absolute path for a settings store file under Documents/Balise/.balise so all
 * app data lives in one exportable folder. plugin-store's `load()` accepts the
 * returned absolute path and creates the `.balise` directory on save.
 */
export async function resolveStorePath(fileName: string): Promise<string> {
	return join(await storeDir(), fileName);
}

/**
 * One-time migration of store files from the legacy plugin-store AppData
 * location to Documents/Balise/.balise. A file is copied only when it is
 * missing at the new location but present at the old one, so this is safe to
 * call on every startup. Run before any store is loaded.
 */
export async function migrateLegacyStores(): Promise<void> {
	const dir = await storeDir();

	for (const fileName of STORE_FILES) {
		const target = await join(dir, fileName);
		if (await exists(target)) continue;
		if (!(await exists(fileName, { baseDir: BaseDirectory.AppData }))) continue;

		await mkdir(dir, { recursive: true });
		const data = await readFile(fileName, { baseDir: BaseDirectory.AppData });
		await writeFile(target, data);
	}
}
