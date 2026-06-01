<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { tagsService, type GraphData } from '$lib/services/tags.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import KnowledgeGraph from '$lib/components/graph/KnowledgeGraph.svelte';
	import KnowledgeGraphSettings from '$lib/components/graph/KnowledgeGraphSettings.svelte';
	import { DEFAULT_GRAPH_SETTINGS, type GraphSettings } from '$lib/components/graph/types';
	import * as m from '$paraglide/messages.js';

	let graphData = $state<GraphData | null>(null);
	let settings = $state<GraphSettings>({ ...DEFAULT_GRAPH_SETTINGS });
	let selectedTag = $state<string | null>(null);

	const maxCooccurrence = $derived(
		graphData ? graphData.links.reduce((m, l) => Math.max(m, l.weight), 1) : 1
	);

	onMount(async () => {
		uiState.setActiveTag(null);
		graphData = await tagsService.loadGraph();
	});

	function handleNavigate(tag: string) {
		uiState.setActiveTag(tag);
		goto(resolve('/'));
	}
</script>

<div class="relative h-full w-full">
	{#if !graphData}
		<div class="text-muted-foreground flex h-full items-center justify-center text-sm">
			{m.graph_loading()}
		</div>
	{:else if graphData.nodes.length === 0}
		<div
			class="text-muted-foreground flex h-full items-center justify-center px-8 text-center text-sm"
		>
			{m.graph_empty()}
		</div>
	{:else}
		<KnowledgeGraph
			nodes={graphData.nodes}
			links={graphData.links}
			{settings}
			bind:selectedTag
			onNavigate={handleNavigate}
		/>
		<KnowledgeGraphSettings bind:settings {maxCooccurrence} />
	{/if}
</div>
