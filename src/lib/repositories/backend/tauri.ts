import { invoke } from '@tauri-apps/api/core';

// Typed wrappers for the Rust/Tauri commands the data-access layer invokes. This
// is the single chokepoint to those commands: it is the only module importing
// `invoke` for them, so repositories never call `invoke` directly. When the
// deferred batched-persistence plan lands, the new transactional command invokes
// are added here.

/** Bring the desk DB to the current schema (creating it if missing). */
export async function migrateDeskDb(deskName: string): Promise<void> {
	await invoke('migrate_desk_db', { deskName });
}

/** Pin a desk note file's mtime to its logical updated_at, so fs-sync does not
 *  treat our own write as a remote edit. */
export async function setDeskFileMtime(
	deskName: string,
	name: string,
	mtimeMs: number
): Promise<void> {
	await invoke('set_desk_file_mtime', { deskName, name, mtimeMs });
}

/** Copy a user-picked file into the desk's `attachments/` folder under the given
 *  filename. The picked file can live anywhere on disk, so the copy runs in Rust
 *  (full disk access) rather than the scope-limited fs plugin. */
export async function copyAttachment(
	deskName: string,
	srcPath: string,
	filename: string
): Promise<void> {
	await invoke('copy_attachment', { deskName, srcPath, filename });
}

/** List the font families installed on the OS, sorted, for the editor
 *  font-family setting. Resolved in Rust so it works on every platform.
 *  Memoized: enumerating the OS fonts has a cold-start cost and the installed
 *  set does not change while the app runs, so the first call is shared by every
 *  later one. A failed call clears the cache so a reopen can retry. */
let fontsPromise: Promise<string[]> | null = null;
export function listFonts(): Promise<string[]> {
	fontsPromise ??= invoke<string[]>('list_fonts').catch((e) => {
		fontsPromise = null;
		throw e;
	});
	return fontsPromise;
}
