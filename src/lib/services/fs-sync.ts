import { invoke } from '@tauri-apps/api/core';
import { fsService } from './fs';
import { settingsService } from './settings.svelte';
import { toasterService } from './toaster';
import * as m from '$paraglide/messages.js';

class FsSyncService {
	// Reconciles the desk's `.md` files with its SQLite DB. The whole diff +
	// import + tag derivation + orphan write-back runs natively (see the Rust
	// `sync_desk_files` command) so a desk switch doesn't pay a per-note round
	// trip across the JS<->SQLite bridge. Magic-tag settings live in the store,
	// so they're passed through for tag derivation. Returns the number of notes
	// re-imported because their file changed on disk and notifies the user.
	async syncDeskFiles(): Promise<void> {
		if (!fsService.currentDesk) return;
		const updated = await invoke<number>('sync_desk_files', {
			deskName: fsService.currentDesk,
			magicTags: settingsService.magicTags.tags
		});
		if (updated > 0) toasterService.info(m.sync_external_changes({ count: updated }));
	}
}

export const fsSyncService = new FsSyncService();
