import { describe, it, expect, vi, beforeEach } from 'vitest';

const fs = vi.hoisted(() => ({
	exists: vi.fn(),
	mkdir: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn()
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	BaseDirectory: { AppData: 'AppData' },
	exists: fs.exists,
	mkdir: fs.mkdir,
	readFile: fs.readFile,
	writeFile: fs.writeFile
}));
vi.mock('@tauri-apps/api/path', () => ({
	documentDir: vi.fn().mockResolvedValue('/Documents'),
	join: vi.fn(async (...parts: string[]) => parts.join('/'))
}));
vi.mock('./desk', () => ({ DESKS_ROOT_DIR: 'Balise' }));

import { migrateLegacyStores } from './store-path';

const NEW_SETTINGS = '/Documents/Balise/.balise/settings.json';
const NEW_UI_STATE = '/Documents/Balise/.balise/ui-state.json';

beforeEach(() => {
	vi.clearAllMocks();
	fs.mkdir.mockResolvedValue(undefined);
	fs.readFile.mockResolvedValue(new Uint8Array([1, 2, 3]));
	fs.writeFile.mockResolvedValue(undefined);
});

describe('migrateLegacyStores', () => {
	it('copies legacy files when missing at the new location but present in AppData', async () => {
		// `exists` is called with a baseDir option only for the old AppData file.
		fs.exists.mockImplementation(async (_path: string, opts?: unknown) => Boolean(opts));

		await migrateLegacyStores();

		expect(fs.writeFile).toHaveBeenCalledWith(NEW_SETTINGS, expect.any(Uint8Array));
		expect(fs.writeFile).toHaveBeenCalledWith(NEW_UI_STATE, expect.any(Uint8Array));
		expect(fs.readFile).toHaveBeenCalledWith('settings.json', { baseDir: 'AppData' });
	});

	it('skips files that already exist at the new location', async () => {
		fs.exists.mockResolvedValue(true);

		await migrateLegacyStores();

		expect(fs.writeFile).not.toHaveBeenCalled();
		expect(fs.readFile).not.toHaveBeenCalled();
	});

	it('skips when no legacy file exists in AppData', async () => {
		fs.exists.mockResolvedValue(false);

		await migrateLegacyStores();

		expect(fs.writeFile).not.toHaveBeenCalled();
	});
});
