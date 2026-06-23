import { migrateLegacyStores, migrateWorkspaceStore } from '$lib/repositories/backend/store';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { themeService } from '$lib/services/theme.svelte';
import { shortcutsService } from '$lib/services/shortcuts.svelte';
import { uiState } from '$lib/services/ui-state.svelte';
import { desksService } from '$lib/services/desks.svelte';
import { trayService } from '$lib/services/system/tray';
import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
import { deviceSyncService } from '$lib/services/sync/device-sync.svelte';
import { devicesService } from '$lib/services/sync/devices.svelte';
import { syncService } from '$lib/services/sync/sync';
import { syncConnectionService } from '$lib/services/sync/sync-connection.svelte';
import { getVersion } from '@tauri-apps/api/app';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { marked } from 'marked';

// App-shell composition root. As the bootstrap it legitimately wires every layer,
// so the few startup-only Tauri reads (app version, bundled news resource) and the
// `window.location.reload` on a language change live here rather than in a leaf
// service. These are the "clearly-marked app-shell function" the concept permits.
//
// The P2P sync stack (`deviceSyncService`, `devicesService`, `syncService`,
// `syncConnectionService`) is out of scope for the rewrite and still on the old
// modules; Concept 09 repoints it to the new Notes/Tags services. `APP_SHORTCUTS`
// is the old definition registry, likewise repointed at cutover.

export async function initApp(): Promise<{ error: string | null }> {
	try {
		await migrateLegacyStores();
		await migrateWorkspaceStore();
		await settingsService.init();
		await deviceSyncService.init();
		await devicesService.init();
		await syncService.init();
		syncConnectionService.start();
		themeService.init();
		await shortcutsService.applyAll(APP_SHORTCUTS);
		await uiState.init();
		await desksService.init();
		await desksService.switchDesk(desksService.activeDesk, uiState.activeTag);
		uiState.ready = true;
		await checkForNews();
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}

	return { error: null };
}

export async function applyLanguageChange(lang: string): Promise<void> {
	await settingsService.general.setLanguage(lang);
	await trayService.remove();
	window.location.reload();
}

export async function checkForNews(): Promise<void> {
	const version = await getVersion();

	if (version === uiState.modal.lastSeenVersion) return;

	try {
		const path = await resolveResource(`../static/news/${version}.md`);
		const md = await readTextFile(path);
		uiState.modal.newsContent = await marked(md);
		uiState.modal.newsVersion = version;
		uiState.modal.isNewsOpen = true;
	} catch {
		uiState.modal.setLastSeenVersion(version);
	}
}
