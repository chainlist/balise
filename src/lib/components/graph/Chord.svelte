<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { C } from './sunburst';

	let {
		id,
		x1,
		y1,
		x2,
		y2,
		c1,
		c2,
		w,
		opacity
	}: {
		id: string;
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		c1: string;
		c2: string;
		w: number;
		opacity: number;
	} = $props();

	// Enter/exit: draw the line (animate stroke-dashoffset) while fading it in.
	function drawFade(node: SVGPathElement, { duration = 500 } = {}) {
		const len = node.getTotalLength();
		return {
			duration,
			easing: cubicOut,
			css: (t: number, u: number) =>
				`stroke-dasharray: ${len}; stroke-dashoffset: ${u * len}; opacity: ${t};`
		};
	}
</script>

<linearGradient id="sb-grad-{id}" gradientUnits="userSpaceOnUse" {x1} {y1} {x2} {y2}>
	<stop offset="0%" stop-color={c2} />
	<stop offset="100%" stop-color={c1} />
</linearGradient>
<path
	d="M {x1} {y1} Q {C} {C} {x2} {y2}"
	fill="none"
	stroke="url(#sb-grad-{id})"
	stroke-width={w}
	stroke-opacity={opacity}
	stroke-linecap="round"
	transition:drawFade
/>

<style>
	/* Smoothly dim/brighten chords as hover focus changes. */
	path {
		transition:
			stroke-opacity 200ms ease,
			stroke-width 200ms ease;
	}
</style>
