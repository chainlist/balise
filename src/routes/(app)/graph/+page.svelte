<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { tagDisplayName } from '$lib/services/content/tags.svelte';
	import { graphService } from '$lib/services/content/graph.svelte';
	import { themeService } from '$lib/services/app/theme.svelte';
	import type { Tag } from '$lib/models/tag';
	import { uiState } from '$lib/services/app/ui-state.svelte';
	import Sunburst from '$lib/components/graph/Sunburst.svelte';
	import ForceGraph from '$lib/components/graph/ForceGraph.svelte';
	import GraphSettings from '$lib/components/graph/GraphSettings.svelte';
	import ForceGraphSettings from '$lib/components/graph/ForceGraphSettings.svelte';
	import type { SunburstArc } from '$lib/components/graph/sunburst';
	import { buildForceGraph } from '$lib/components/graph/force-graph';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { ArrowLeftIcon, SettingsIcon, ChartPieIcon, NetworkIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import { assignGraphColors, DEFAULT_TAG_COLOR } from '$lib/utils/graph-colors';

	let loaded = $state(false);
	const mode = $derived(uiState.graphMode);
	const selected = $derived(uiState.activeTag);
	const isDark = $derived(themeService.isDark);

	let prevDesk = uiState.activeDesk;
	$effect(() => {
		const desk = uiState.activeDesk;
		if (desk !== prevDesk) {
			prevDesk = desk;
			graphService.load();
		}
	});
	let categoryCount = $state(10);
	let minStrength = $state(0);
	let settingsOpen = $state(false);

	// Network-mode tunables (page-local, like the sunburst sliders).
	let repulsion = $state(380);
	let linkDistance = $state(90);
	let hideIsolated = $state(false);

	onMount(() => {
		uiState
			.setActiveTag(null)
			.then(() => graphService.load())
			.then(() => (loaded = true));
	});

	const rankedTags = $derived(graphService.rankedTags);

	// Stable color per tag (by score rank), honouring custom colors.
	const colorByLower = $derived(assignGraphColors(rankedTags, isDark));

	function colorFor(t: Tag): string {
		return colorByLower[t.tag.toLowerCase()] ?? DEFAULT_TAG_COLOR;
	}

	function arcFor(t: Tag): SunburstArc {
		return {
			label: tagDisplayName(t),
			noteCount: t.count,
			color: colorFor(t),
			relatedTags: graphService.neighborsOf(t.tag, minStrength).map((n) => ({
				label: tagDisplayName(n.tag),
				color: colorFor(n.tag),
				weight: n.weight
			}))
		};
	}

	const selectedTag = $derived.by(() => {
		if (!selected) return null;
		const lower = selected.toLowerCase();
		return rankedTags.find((t) => t.tag.toLowerCase() === lower) ?? null;
	});

	const arcs = $derived.by<SunburstArc[]>(() => {
		if (selectedTag) {
			return graphService
				.neighborsOf(selectedTag.tag, minStrength)
				.slice(0, Math.max(1, categoryCount))
				.map((n) => arcFor(n.tag));
		}
		const n = Math.max(1, Math.min(categoryCount, rankedTags.length));
		return rankedTags.slice(0, n).map((t) => arcFor(t));
	});

	const centerLabel = $derived(selectedTag ? tagDisplayName(selectedTag) : null);

	// Force mode shows every tag and every co-occurrence (ignores the sliders).
	const forceGraph = $derived(
		buildForceGraph(rankedTags, graphService.weightedEdges, {
			colorFor,
			labelFor: tagDisplayName,
			hideIsolated
		})
	);

	function handleArc(label: string) {
		const t = rankedTags.find((tag) => tagDisplayName(tag) === label);
		if (t) uiState.setActiveTag(t.tag);
	}

	// The center shows the selected tag; clicking it opens that tag's notes.
	function openSelectedNotes() {
		if (!selectedTag) return;
		uiState.setActiveTag(selectedTag.tag);
		goto(resolve('/'));
	}

	// A node click re-centers that tag as the hub; a double-click opens its notes.
	function openTagNotes(tag: string) {
		uiState.setActiveTag(tag).then(() => goto(resolve('/')));
	}
</script>

<div class="relative h-full w-full p-6">
	{#if !loaded}
		<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
			{m.graph_loading()}
		</div>
	{:else if rankedTags.length === 0}
		<div
			class="flex h-full items-center justify-center px-8 text-center text-sm text-muted-foreground"
		>
			{m.graph_empty()}
		</div>
	{:else}
		{#if selectedTag}
			<Button
				variant="outline"
				size="sm"
				class="absolute top-8 left-8 z-10"
				onclick={() => uiState.setActiveTag(null)}
			>
				<ArrowLeftIcon class="size-4" />
				{tagDisplayName(selectedTag)}
			</Button>
		{/if}

		<div
			class="frost-surface absolute top-8 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded p-1"
		>
			<Button
				variant={mode === 'sunburst' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => uiState.setGraphMode('sunburst')}
				aria-label={m.graph_mode_sunburst()}
			>
				<ChartPieIcon class="size-4" />
				{m.graph_mode_sunburst()}
			</Button>
			<Button
				variant={mode === 'force' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => uiState.setGraphMode('force')}
				aria-label={m.graph_mode_force()}
			>
				<NetworkIcon class="size-4" />
				{m.graph_mode_force()}
			</Button>
		</div>

		{#if settingsOpen}
			{#if mode === 'sunburst'}
				<GraphSettings
					bind:categoryCount
					bind:minStrength
					onclose={() => (settingsOpen = false)}
				/>
			{:else}
				<ForceGraphSettings
					bind:repulsion
					bind:linkDistance
					bind:hideIsolated
					onclose={() => (settingsOpen = false)}
				/>
			{/if}
		{:else}
			<Button
				variant="outline"
				size="sm"
				class="absolute top-8 right-8 z-10"
				onclick={() => (settingsOpen = true)}
			>
				<SettingsIcon class="size-4" />
				{m.graph_settings_title()}
			</Button>
		{/if}

		<div class="h-full w-full {mode === 'sunburst' ? 'pt-14' : ''}">
			{#if mode === 'sunburst'}
				<Sunburst
					{centerLabel}
					fallbackLabel={uiState.activeDesk}
					{arcs}
					onArcClick={handleArc}
					onCenterClick={openSelectedNotes}
				/>
			{:else}
				<ForceGraph
					nodes={forceGraph.nodes}
					links={forceGraph.links}
					{selected}
					{isDark}
					{repulsion}
					{linkDistance}
					onSelect={(tag) => uiState.setActiveTag(tag)}
					onOpen={openTagNotes}
				/>
			{/if}
		</div>
	{/if}
</div>
