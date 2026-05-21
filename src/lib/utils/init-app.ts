import { uiState } from '$lib/services/ui-state.svelte';
import { themeService } from '$lib/services/theme.svelte';
import { settingsService } from '$lib/services/settings.svelte';

export async function initApp() {
	try {
		await settingsService.init();
		themeService.init();
		const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 100));
		await uiState.init();
		await uiState.switchDesk(uiState.activeDesk, uiState.activeTag);
		await minDelay;
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}

	return { error: null };
}
