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
