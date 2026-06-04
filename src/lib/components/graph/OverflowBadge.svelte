<script lang="ts">
	let {
		x,
		y,
		count,
		op,
		label,
		onenter,
		onleave
	}: {
		x: number;
		y: number;
		count: number;
		op: number;
		label: string;
		onenter?: () => void;
		onleave?: () => void;
	} = $props();
</script>

<g role="img" aria-label={label} onmouseenter={onenter} onmouseleave={onleave}>
	<circle cx={x} cy={y} r="9" class="fill-muted" fill-opacity={op} />
	<text
		{x}
		{y}
		text-anchor="middle"
		dominant-baseline="central"
		font-size="9"
		class="pointer-events-none fill-muted-foreground"
		fill-opacity={op}
	>
		+{count}
	</text>
</g>

<style>
	/* Smoothly dim/brighten the overflow badge as hover focus changes. */
	circle,
	text {
		transition: fill-opacity 200ms ease;
	}
</style>
