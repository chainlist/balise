import { settingsService } from '$lib/services/settings.svelte';
import { themeService } from '$lib/services/theme.svelte';
import { uiState } from '$lib/services/ui-state.svelte';
import { tagsService } from '$lib/services/tags.svelte';
import { openDesk } from '$lib/services/desk';
import { fsService } from '$lib/services/fs';

export async function initQuickCapture(): Promise<{ error: string | null }> {
	try {
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
