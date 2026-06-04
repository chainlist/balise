<script lang="ts">
	let {
		title,
		sub,
		x,
		y
	}: {
		title: string;
		sub?: string | null;
		x: number;
		y: number;
	} = $props();
</script>

<div
	class="pointer-events-none absolute z-10 max-w-55 border bg-card px-2.5 py-1.5 text-on-surface"
	style="left: {x}px; top: {y}px; border-radius: var(--radius-md);"
>
	<div class="text-xs font-medium">{title}</div>
	{#if sub}
		<div class="mt-0.5 text-[10px] text-on-surface-variant">{sub}</div>
	{/if}
</div>
