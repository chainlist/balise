import { uiState } from '$lib/services/ui-state.svelte';
import { themeService } from '$lib/services/theme.svelte';
import { settingsService } from '$lib/services/settings.svelte';
import { trayService } from '$lib/services/tray';
import { getVersion } from '@tauri-apps/api/app';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { marked } from 'marked';

export async function initApp() {
	try {
		await settingsService.init();
		themeService.init();
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
	await settingsService.setLanguage(lang);
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
