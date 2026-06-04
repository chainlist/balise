<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { tagsService, type SunburstData } from '$lib/services/tags.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import Sunburst from '$lib/components/graph/Sunburst.svelte';
	import * as m from '$paraglide/messages.js';

	let data = $state<SunburstData | null>(null);

	onMount(async () => {
		await uiState.setActiveTag(null);
		data = await tagsService.loadSunburst();
	});

	function handleSelectTag(tag: string) {
		uiState.setActiveTag(tag);
		goto(resolve('/'));
	}
</script>

<div class="h-full w-full overflow-auto p-6">
	{#if !data}
		<div class="text-muted-foreground flex h-full items-center justify-center text-sm">
			{m.graph_loading()}
		</div>
	{:else if data.tags.length === 0}
		<div
			class="text-muted-foreground flex h-full items-center justify-center px-8 text-center text-sm"
		>
			{m.graph_empty()}
		</div>
	{:else}
		<Sunburst
			tags={data.tags}
			cooccurrences={data.cooccurrences}
			onSelectTag={handleSelectTag}
		/>
	{/if}
</div>
