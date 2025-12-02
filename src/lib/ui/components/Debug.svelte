<script lang="ts">
	import { useCommandManager } from '$lib/core/commands/manager.svelte';
	import { useState } from '$lib/states/index.svelte';
	import { useStore } from '@xyflow/svelte';
	import { fly } from 'svelte/transition';

	const store = $derived(useStore());
	const { app, settings } = useState();

	const selectedIds = $derived(store.selectedNodes.map((node) => node.id).join(', '));

	const mngr = useCommandManager();
	const history = $derived(mngr.history);

	function isActive(currIndex: number) {
		return currIndex === mngr.currIndex;
	}
</script>

{#if settings.ui.debugMode}
	<div
		class="rounded-md bg-black p-4 text-white ring-4 ring-yellow-400"
		transition:fly={{ y: -20, x: 20, duration: settings.ui.animationDuration }}
	>
		<p>Hovered ID: {app.hoveredNodeId}</p>
		<p>Selected IDs: {selectedIds}</p>

		<ul>
			{#each history as item, i (i)}
				<li>{isActive(i) ? '✔️' : ''} {item.constructor.name}</li>
			{/each}
		</ul>
	</div>
{/if}
