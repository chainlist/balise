<script lang="ts">
	import { C, RC } from '$lib/core/domain/graph';

	let {
		centerLabel,
		fallbackLabel = 'Balise',
		onclick,
		onkeydown
	}: {
		centerLabel: string | null;
		fallbackLabel?: string;
		onclick?: () => void;
		onkeydown?: (e: KeyboardEvent) => void;
	} = $props();

	const display = $derived(centerLabel ?? fallbackLabel);

	// Fit the label inside the center circle: shrink the font for longer labels
	// (down to a floor), then ellipsize anything still too long to fit.
	const USABLE = RC * 2 - 24; // available text width inside the circle
	const MIN_SIZE = 9;
	const MAX_SIZE = 15;
	const CHAR = 0.6; // monospace advance ≈ 0.6em

	const maxChars = Math.floor(USABLE / (CHAR * MIN_SIZE));
	const shown = $derived(
		display.length > maxChars ? display.slice(0, maxChars - 1) + '…' : display
	);
	const fontSize = $derived(
		Math.min(MAX_SIZE, Math.max(MIN_SIZE, USABLE / (CHAR * Math.max(shown.length, 1))))
	);
</script>

<g
	role="button"
	tabindex="-1"
	aria-label={display}
	class="outline-none focus:outline-none focus-visible:outline-none {centerLabel
		? 'cursor-pointer'
		: ''}"
	{onclick}
	{onkeydown}
>
	<circle cx={C} cy={C} r={RC} class="fill-muted stroke-border" fill-opacity="0.4" />
	<text
		x={C}
		y={C}
		text-anchor="middle"
		dominant-baseline="central"
		font-size={fontSize}
		font-weight="600"
		font-family="monospace"
		class="pointer-events-none fill-foreground"
	>
		{shown}
	</text>
</g>
