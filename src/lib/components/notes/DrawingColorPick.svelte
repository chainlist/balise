<script lang="ts">
	import * as Popover from '$lib/components/shadcn/popover';
	import { COLOR_PALETTE } from '$lib/utils/color-palette';
	import { TRANSPARENT } from '$lib/domain/shape';
	import { CheckIcon } from '@lucide/svelte';

	// One color slot of the shape tool (fill or outline): a swatch trigger
	// opening the palette plus a transparent/none option. `ring` renders the
	// trigger as a hollow ring so the outline slot reads as an outline.
	let {
		label,
		value,
		ring = false,
		onselect
	}: {
		label: string;
		value: string;
		ring?: boolean;
		onselect: (color: string) => void;
	} = $props();

	let open = $state(false);

	// A red slash over an empty swatch marks the transparent option.
	const slash =
		'linear-gradient(to top right, transparent 45%, #e87a6a 45%, #e87a6a 55%, transparent 55%)';

	function pick(color: string) {
		onselect(color);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		aria-label={label}
		title={label}
		class="flex size-5 items-center justify-center rounded-full transition-transform hover:scale-110"
	>
		{#if value === TRANSPARENT}
			<span class="size-5 rounded-full border border-border" style="background: {slash}"></span>
		{:else if ring}
			<span class="size-5 rounded-full border-[3px]" style="border-color: {value}"></span>
		{:else}
			<span class="size-5 rounded-full" style="background: {value}"></span>
		{/if}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-1.5">
		<div class="grid grid-cols-4 gap-1">
			{#each [TRANSPARENT, ...COLOR_PALETTE] as color (color)}
				<button
					type="button"
					aria-label="{label} {color}"
					aria-pressed={value === color}
					class="flex size-6 items-center justify-center rounded-full border transition-transform hover:scale-110 {color ===
					TRANSPARENT
						? 'border-border'
						: 'border-transparent'}"
					style="background: {color === TRANSPARENT ? slash : color}"
					onclick={() => pick(color)}
				>
					{#if value === color}
						<CheckIcon
							class="size-3.5 {color === TRANSPARENT
								? 'text-foreground'
								: 'text-white'} drop-shadow-sm"
							strokeWidth={3}
						/>
					{/if}
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>
