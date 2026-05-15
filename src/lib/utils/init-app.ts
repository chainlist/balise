import { initUIState, switchDesk, uiState } from '$lib/services/ui-state.svelte';

export async function initApp() {
	try {
		await initUIState();
		await switchDesk(uiState.activeDesk);
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}

	return { error: null };
}
