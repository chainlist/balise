import { settingsService } from '$lib/services/settings/settings.svelte';
import { themeService } from '$lib/services/app/theme.svelte';
import { uiState } from '$lib/services/app/ui-state.svelte';
import { tagsService } from '$lib/services/content/tags.svelte';
import { openDesk } from '$lib/services/platform/desk';
import { fsService } from '$lib/services/platform/fs';
import { migrateLegacyStores } from '$lib/services/platform/store-path';

export async function initQuickCapture(): Promise<{ error: string | null }> {
	try {
		await migrateLegacyStores();
		await settingsService.init();
		themeService.init();
		await uiState.init();
		await openDesk(uiState.activeDesk);
		fsService.setDesk(uiState.activeDesk);
		await tagsService.load();
		uiState.ready = true;
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}
	return { error: null };
}

/**
 * Re-point the quick window at the currently active desk. The window is long-lived
 * (shown/hidden, never reloaded), so the main window may have switched desks or
 * closed the shared SQLite pool since init. Force-reopening reconnects a closed
 * pool and follows the active desk. Called whenever the window regains focus.
 */
export async function resyncQuickCapture(): Promise<void> {
	const desk = await uiState.refreshActiveDesk();
	await openDesk(desk, { force: true });
	fsService.setDesk(desk);
	await tagsService.load();
}
