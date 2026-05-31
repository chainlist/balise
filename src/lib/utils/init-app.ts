import { uiState } from '$lib/services/ui-state.svelte';
import { themeService } from '$lib/services/theme.svelte';
import { settingsService } from '$lib/services/settings.svelte';
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

export async function checkForNews() {
	const version = '0.15.0';
	await getVersion();

	if (version === uiState.lastSeenVersion) return;

	try {
		const path = await resolveResource(`../static/news/${version}.md`);
		const md = await readTextFile(path);
		uiState.newsContent = await marked(md);
		uiState.newsVersion = version;
		uiState.isNewsOpen = true;
	} catch {
		uiState.setLastSeenVersion(version);
	}
}
