<script lang="ts">
	import * as m from '$paraglide/messages.js';
	import { ra } from '$lib/core/domain/graph';

	let {
		path,
		color,
		isSelected = false,
		label,
		noteCount,
		labelPos,
		op,
		onenter,
		onleave,
		onclick,
		onkeydown
	}: {
		path: string;
		color: string;
		isSelected?: boolean;
		label: string;
		noteCount: number;
		labelPos: { x: number; y: number; deg: number };
		op: number;
		onenter?: () => void;
		onleave?: () => void;
		onclick?: () => void;
		onkeydown?: (e: KeyboardEvent) => void;
	} = $props();
</script>

<path
	d={path}
	fill={ra(color, (isSelected ? 0.22 : 0.12) * op)}
	stroke={ra(color, (isSelected ? 0.85 : 0.5) * op)}
	stroke-width={isSelected ? 1.6 : 0.9}
	class="cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
	role="button"
	tabindex="-1"
	aria-label={label}
	onmouseenter={onenter}
	onmouseleave={onleave}
	{onclick}
	{onkeydown}
/>
<g
	transform="translate({labelPos.x} {labelPos.y}) rotate({labelPos.deg})"
	class="pointer-events-none"
	text-anchor="middle"
>
	<text y="-3" font-size="15" font-weight="500" font-family="monospace" fill={ra(color, op)}>
		{label}
	</text>
	<text y="12" font-size="9.5" font-family="monospace" fill={ra(color, 0.7 * op)}>
		{m.graph_arc_notes({ count: noteCount })}
	</text>
</g>

<style>
	/* Smoothly dim/brighten arcs and their labels as hover focus changes
	   (the focus opacity is baked into the fill/stroke alpha). */
	path {
		transition:
			fill 200ms ease,
			stroke 200ms ease,
			stroke-width 200ms ease;
	}
	text {
		transition: fill 200ms ease;
	}
</style>
