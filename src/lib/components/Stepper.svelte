<script lang="ts">
	import { MinusIcon, PlusIcon } from '@lucide/svelte';

	let {
		value,
		min,
		max,
		step,
		onValueChange,
		label
	}: {
		value: number;
		min: number;
		max: number;
		step: number;
		onValueChange: (value: number) => void;
		label: string;
	} = $props();
</script>

<div class="flex items-center gap-0.5 rounded-lg border border-input bg-background p-0.5">
	<button
		type="button"
		aria-label="Decrease {label}"
		disabled={value <= min}
		onclick={() => onValueChange(value - step)}
		class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
	>
		<MinusIcon size={14} />
	</button>
	<span class="w-10 text-center text-sm font-medium tabular-nums">{value}</span>
	<button
		type="button"
		aria-label="Increase {label}"
		disabled={value >= max}
		onclick={() => onValueChange(value + step)}
		class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
	>
		<PlusIcon size={14} />
	</button>
</div>
