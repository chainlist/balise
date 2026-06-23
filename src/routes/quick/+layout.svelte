<script lang="ts">
	import { onMount } from 'svelte';
	import { initQuickCapture } from '$lib/services/quick-bootstrap';
	import { uiState } from '$lib/services/ui-state.svelte';

	let { children } = $props();

	let error = $state<string | null>(null);
	let ready = $derived(uiState.ready);

	onMount(async () => {
		const { error: initError } = await initQuickCapture();
		error = initError;
	});
</script>

{#if error}
	<div class="flex h-screen items-center justify-center text-destructive">{error}</div>
{:else if ready}
	{@render children()}
{/if}

<style>
	:global(body) {
		background: transparent;
	}
</style>
