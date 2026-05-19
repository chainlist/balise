import { initUIState, switchDesk, uiState } from '$lib/services/ui-state.svelte';

export async function initApp() {
	try {
		const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 100));
		await initUIState();
		await switchDesk(uiState.activeDesk, uiState.activeTag);
		await minDelay;
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}

	return { error: null };
}
