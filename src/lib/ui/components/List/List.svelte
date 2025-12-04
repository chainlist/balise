<script lang="ts">
	import { useCollapsed } from '$lib/core/commands/list/collapse-entry.command';
	import type { Entry } from '$lib/core/entry/model';
	import { useState } from '$lib/states/index.svelte';
	import Self from './List.svelte';
	import { CircleChevronDown } from '@lucide/svelte';
	import { Button } from '$lib/ui/components/shadcn/button/index.js';
	import { fade } from 'svelte/transition';

	let {
		color,
		...props
	}: {
		isRoot?: boolean;
		entry: Entry;
		color?: string;
		isBranchStart?: boolean;
		index?: number;
	} = $props();

	const { app, settings } = useState();

	const children = $derived(app.entries.filter((e) => e.parentId === props.entry.id));
	const hasChildren = $derived(children.length > 0);
	const branchColors = $derived(settings.ui.colorSchemes[settings.ui.colorScheme].branches);

	function getColor(index: number) {
		return !color ? branchColors[index % branchColors.length] : color;
	}

	function collapsed(entryId: string) {
		useCollapsed({ entryId });
	}
</script>

<div
	class="pl-2"
	class:ml-3={!!color}
	class:border-l-2={!!color}
	style:border-left-color={color && hasChildren ? color : 'transparent'}
	class:mb-4={props.isBranchStart}
>
	<div class="flex items-center gap-2">
		{#if !hasChildren}
			<div class="-ml-3.25 aspect-square h-2 w-2 rounded-full" style:background-color={color}></div>
		{:else if !props.isRoot}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="-ml-4 bg-white" onclick={() => collapsed(props.entry.id)}>
				{#if props.entry.collapsed}
					<CircleChevronDown size="14" class="rotate-[-90deg]" />
				{:else}
					<CircleChevronDown size="14" />
				{/if}
			</div>
		{/if}
		<span class:font-semibold={props.isRoot}>{props.entry.content}</span>
	</div>

	{#if !props.entry.collapsed}
		<ul class="ml-2" transition:fade={{ duration: 200 }}>
			{#each children as child, index (child.id)}
				<li>
					<Self entry={child} color={getColor(index)} isRoot={false} isBranchStart={props.isRoot} />
				</li>
			{/each}
		</ul>
	{/if}
</div>
