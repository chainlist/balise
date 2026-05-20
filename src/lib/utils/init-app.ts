import { uiState } from '$lib/services/ui-state.svelte';
import { themeService } from '$lib/services/theme.svelte';
import { editorService } from '$lib/services/editor.svelte';
import { shortcutsService } from '$lib/services/shortcuts.svelte';

export async function initApp() {
	try {
		themeService.init();
		editorService.init();
		shortcutsService.init();
		const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 100));
		await uiState.init();
		await uiState.switchDesk(uiState.activeDesk, uiState.activeTag);
		await minDelay;
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}

	return { error: null };
}
