<script lang="ts" module>
	export type MenuItem = 'sep' | { label: string; action: () => void };
</script>

<script lang="ts">
	let {
		items,
		x,
		y,
		onclose
	}: {
		items: MenuItem[];
		x: number;
		y: number;
		onclose: () => void;
	} = $props();

	let menuEl = $state<HTMLElement | undefined>(undefined);

	// Close on any outside mousedown or Escape, capture-phase so the menu wins
	// over whatever else the event would reach.
	$effect(() => {
		const onDocDown = (e: MouseEvent) => {
			if (menuEl && !menuEl.contains(e.target as Node)) onclose();
		};
		const onDocKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onclose();
		};
		document.addEventListener('mousedown', onDocDown, true);
		document.addEventListener('keydown', onDocKey, true);
		return () => {
			document.removeEventListener('mousedown', onDocDown, true);
			document.removeEventListener('keydown', onDocKey, true);
		};
	});

	function run(e: MouseEvent, action: () => void) {
		e.preventDefault();
		e.stopPropagation();
		onclose();
		action();
	}
</script>

<div bind:this={menuEl} class="cm-md-table-menu" style:left="{x}px" style:top="{y}px">
	{#each items as item, i (i)}
		{#if item === 'sep'}
			<div class="cm-md-table-menu-sep"></div>
		{:else}
			<button type="button" class="cm-md-table-menu-item" onmousedown={(e) => run(e, item.action)}>
				{item.label}
			</button>
		{/if}
	{/each}
</div>
