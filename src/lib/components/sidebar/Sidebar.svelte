<script lang="ts">
	import AccordionSidebar from '$lib/components/sidebar/AccordionSidebar.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
</script>

<div class="flex h-screen w-75 flex-col">
	<AccordionSidebar />
</div>

<SettingsModal open={uiState.isSettingsOpen} />
