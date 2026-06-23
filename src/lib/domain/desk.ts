// Desk domain: the pure rules for a workspace's name and the desk list. A desk is
// a folder under Documents/Balise/<deskName> with its own SQLite DB; these rules
// decide what a valid desk name is, which on-disk folders count as desks, and when
// one may be removed. No I/O, no Svelte, no Tauri — the storage root (`DESKS_ROOT_DIR`)
// is a data-access detail and lives with the backend fs adapter, not here.

/** The desk every install starts with and falls back to. */
export const DEFAULT_DESK = 'Personal';

/**
 * Clean a user-entered desk name into a filesystem-safe folder name: trim, then
 * replace characters illegal in Windows/macOS paths with `-`. Throws when nothing
 * usable remains, so callers never create an empty-named desk.
 */
export function sanitizeDeskName(desk: string): string {
	const sanitized = desk.trim().replace(/[\\/:*?"<>|]/g, '-');
	if (!sanitized) {
		throw new Error('Desk name cannot be empty.');
	}
	return sanitized;
}

/** A desk may be removed only while at least one other would remain. */
export function canRemoveDesk(desks: string[]): boolean {
	return desks.length > 1;
}

/**
 * Dot-prefixed folders under `Balise/` (e.g. the `.balise` settings folder) are
 * app data, not desks, so desk listing skips them.
 */
export function isAppDataFolder(name: string): boolean {
	return name.startsWith('.');
}
