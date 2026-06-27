<script lang="ts">
	import { onMount } from 'svelte';
	import { initQuickCapture } from '$lib/services/quick-bootstrap';
	import { uiState } from '$lib/services/ui-state.svelte';
	import TitleBar from '$lib/components/TitleBar.svelte';
	import { isMac } from '$lib/utils/platform';

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
	<!-- macOS shows native vibrancy through the transparent body; every other
	     platform paints the app's mesh background so the quick window matches the
	     main window instead of letting whatever is behind it show through. -->
	<div class={['flex h-screen w-full flex-col', !isMac && 'bg-mesh dark:bg-mesh-dark']}>
		<TitleBar />
		<div class="min-h-0 flex-1">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background: transparent;
	}
</style>
