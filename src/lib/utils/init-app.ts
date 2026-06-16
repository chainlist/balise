import { uiState } from '$lib/services/app/ui-state.svelte';
import { themeService } from '$lib/services/app/theme.svelte';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { devicesService } from '$lib/services/sync/devices.svelte';
import { syncService } from '$lib/services/sync/sync';
import { globalShortcutService } from '$lib/services/platform/global-shortcut.svelte';
import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
import { migrateLegacyStores } from '$lib/services/platform/store-path';
import { deviceSyncService } from '$lib/services/sync/device-sync.svelte';
import { syncConnectionService } from '$lib/services/sync/sync-connection.svelte';
import { trayService } from '$lib/services/platform/tray';
import { getVersion } from '@tauri-apps/api/app';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { marked } from 'marked';

export async function initApp() {
	try {
		await migrateLegacyStores();
		await settingsService.init();
		await deviceSyncService.init();
		await devicesService.init();
		await syncService.init();
		syncConnectionService.start();
		if (settingsService.sync.state.enabled) deviceSyncService.startInterval();
		themeService.init();
		await globalShortcutService.applyAll(APP_SHORTCUTS);
		await uiState.init();
		await uiState.switchDesk(uiState.activeDesk, uiState.activeTag);
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

export async function checkForNews() {
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
