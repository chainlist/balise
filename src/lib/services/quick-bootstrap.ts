import { migrateLegacyStores, migrateWorkspaceStore } from '$lib/repositories/backend/store';
import { deskRepo } from '$lib/repositories/desk.repo';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { themeService } from '$lib/services/theme.svelte';
import { uiState } from '$lib/services/ui-state.svelte';
import { desksService } from '$lib/services/desks.svelte';
import { tagsService } from '$lib/services/tags.svelte';

// Quick-capture window bootstrap: a minimal sibling of `app-bootstrap`. The quick
// window only needs settings (for the theme and the magic-tag rules `Note.create`
// applies), the active desk's DB open, and the tag list — no full desk switch (so
// no note-list load or file sync) and none of the tray / shortcuts / sync stack.
// As a composition-root function it legitimately reaches the backend store
// migration and the desk repo directly, the same exception `app-bootstrap` uses.

export async function initQuickCapture(): Promise<{ error: string | null }> {
	try {
		await migrateLegacyStores();
		await migrateWorkspaceStore();
		await settingsService.init();
		themeService.init();
		await uiState.init();
		await desksService.init();
		await deskRepo.open(desksService.activeDesk);
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
	const desk = await desksService.refreshActiveDesk();
	await deskRepo.open(desk, { force: true });
	await tagsService.load();
}
