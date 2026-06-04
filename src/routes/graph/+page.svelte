<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { tagDisplayName } from '$lib/services/tags.svelte';
	import { graphService } from '$lib/services/graph.svelte';
	import type { Tag } from '$lib/models/tag';
	import { uiState } from '$lib/services/ui-state.svelte';
	import Sunburst from '$lib/components/graph/Sunburst.svelte';
	import type { SunburstArc } from '$lib/components/graph/sunburst';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { ArrowLeftIcon, ChevronUpIcon, SettingsIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	const DEFAULT_TAG_COLOR = '#7F77DD';
	const PALETTE_LIGHT = [
		'#7F77DD',
		'#1D9E75',
		'#D85A30',
		'#378ADD',
		'#9333EA',
		'#E0A30E',
		'#D6336C',
		'#0CA678'
	];
	const PALETTE_DARK = [
		'#AFA9EC',
		'#5DCAA5',
		'#F0997B',
		'#85B7EB',
		'#C084FC',
		'#F5CF5B',
		'#F06595',
		'#38D9A9'
	];

	let loaded = $state(false);
	const selected = $derived(uiState.activeTag);

	let prevDesk = uiState.activeDesk;
	$effect(() => {
		const desk = uiState.activeDesk;
		if (desk !== prevDesk) {
			prevDesk = desk;
			graphService.load();
		}
	});
	let categoryCount = $state(10);
	let minCooccurrence = $state(1);
	let settingsOpen = $state(false);
	let isDark = $state(false);

	onMount(() => {
		isDark = document.documentElement.classList.contains('dark');
		const mo = new MutationObserver(() => {
			isDark = document.documentElement.classList.contains('dark');
		});
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		uiState
			.setActiveTag(null)
			.then(() => graphService.load())
			.then(() => (loaded = true));

		return () => mo.disconnect();
	});

	const rankedTags = $derived(graphService.rankedTags);
	const palette = $derived(isDark ? PALETTE_DARK : PALETTE_LIGHT);

	// Stable color per tag (by score rank), honouring custom colors.
	const colorByLower = $derived.by(() => {
		const map: Record<string, string> = {};
		rankedTags.forEach((t, i) => {
			map[t.tag.toLowerCase()] =
				t.color && t.color.toUpperCase() !== DEFAULT_TAG_COLOR
					? t.color
					: palette[i % palette.length];
		});
		return map;
	});

	function labelFor(t: Tag): string {
		return t.display_name ?? `#${t.tag}`;
	}

	function colorFor(t: Tag): string {
		return colorByLower[t.tag.toLowerCase()] ?? DEFAULT_TAG_COLOR;
	}

	function arcFor(t: Tag): SunburstArc {
		return {
			label: labelFor(t),
			noteCount: t.count,
			color: colorFor(t),
			relatedTags: graphService.neighborsOf(t.tag, minCooccurrence).map((n) => ({
				label: labelFor(n.tag),
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
				.neighborsOf(selectedTag.tag, minCooccurrence)
				.slice(0, Math.max(1, categoryCount))
				.map((n) => arcFor(n.tag));
		}
		const n = Math.max(1, Math.min(categoryCount, rankedTags.length));
		return rankedTags.slice(0, n).map((t) => arcFor(t));
	});

	const centerLabel = $derived(selectedTag ? labelFor(selectedTag) : null);

	function handleArc(label: string) {
		const t = rankedTags.find((tag) => labelFor(tag) === label);
		if (t) uiState.setActiveTag(t.tag);
	}

	// The center shows the selected tag; clicking it opens that tag's notes.
	function openSelectedNotes() {
		if (!selectedTag) return;
		uiState.setActiveTag(selectedTag.tag);
		goto(resolve('/'));
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

		{#if settingsOpen}
			<div class="absolute top-8 right-8 z-10 w-64 rounded border bg-card p-4 shadow-md">
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-sm font-semibold text-foreground">{m.graph_settings_title()}</h2>
					<button
						type="button"
						class="rounded p-1 text-muted-foreground hover:text-foreground"
						onclick={() => (settingsOpen = false)}
						aria-label={m.graph_settings_close()}
					>
						<ChevronUpIcon class="size-4" />
					</button>
				</div>

				<div class="space-y-4">
					<label class="block">
						<div class="mb-1 flex items-center justify-between">
							<div>
								<span class="text-xs text-foreground">{m.graph_settings_tags()}</span>
								<p class="text-[10px] text-muted-foreground">{m.graph_settings_tags_desc()}</p>
							</div>
							<span class="text-xs text-muted-foreground tabular-nums">{categoryCount}</span>
						</div>
						<input
							type="range"
							min="1"
							max={20}
							step="1"
							bind:value={categoryCount}
							class="w-full"
						/>
					</label>

					<label class="block">
						<div class="mb-1 flex items-center justify-between">
							<span class="text-xs text-foreground">{m.graph_settings_min_cooccurrence()}</span>
							<span class="text-xs text-muted-foreground tabular-nums">{minCooccurrence}</span>
						</div>
						<input
							type="range"
							min="1"
							max={Math.max(1, graphService.maxWeight)}
							step="1"
							bind:value={minCooccurrence}
							class="w-full"
						/>
					</label>
				</div>
			</div>
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

		<div class="h-full w-full">
			<Sunburst
				{centerLabel}
				fallbackLabel={uiState.activeDesk}
				{arcs}
				onArcClick={handleArc}
				onCenterClick={openSelectedNotes}
			/>
		</div>
	{/if}
</div>
