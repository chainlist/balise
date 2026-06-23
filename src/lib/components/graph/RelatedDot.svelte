<script lang="ts">
	import { ra } from '$lib/domain/graph';

	let {
		cx,
		cy,
		r,
		color,
		op,
		arcLabel,
		tagLabel,
		onenter,
		onleave
	}: {
		cx: number;
		cy: number;
		r: number;
		color: string;
		op: number;
		arcLabel: string;
		tagLabel: string;
		onenter?: () => void;
		onleave?: () => void;
	} = $props();
</script>

<circle
	{cx}
	{cy}
	{r}
	fill={ra(color, op)}
	class="outline-none focus:outline-none focus-visible:outline-none"
	role="img"
	aria-label="{arcLabel} ∩ {tagLabel}"
	onmouseenter={onenter}
	onmouseleave={onleave}
/>

<style>
	/* Smoothly dim/brighten dots as hover focus changes
	   (the focus opacity is baked into the fill alpha). */
	circle {
		transition: fill 200ms ease;
	}
</style>
