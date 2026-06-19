<script lang="ts">
	import { Popover } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { COLOR_PALETTE } from '$lib/utils/color-palette';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';

	let {
		value = null,
		palette = COLOR_PALETTE,
		onpick,
		trigger,
		triggerClass,
		triggerAriaLabel,
		onOpenChange
	}: {
		/** Currently-selected color, highlighted in the grid and seeded into the custom input. */
		value?: string | null;
		palette?: string[];
		onpick: (color: string) => void;
		/** Inner content of the trigger button (e.g. an icon). The swatch look comes from triggerClass. */
		trigger?: Snippet;
		triggerClass?: string;
		triggerAriaLabel: string;
		/** Notified when the popover opens/closes (used to keep a floating toolbar put while picking). */
		onOpenChange?: (open: boolean) => void;
	} = $props();

	let open = $state(false);

	function pickCustom(e: Event & { currentTarget: HTMLInputElement }) {
		onpick(e.currentTarget.value);
		open = false;
	}
</script>

<Popover.Root bind:open onOpenChange={(o) => onOpenChange?.(o)}>
	<Popover.Trigger class={triggerClass} aria-label={triggerAriaLabel}>
		{@render trigger?.()}
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			sideOffset={6}
			class="z-50 grid grid-cols-6 gap-2 rounded-xl bg-popover p-3 shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"
		>
			{#each palette as color (color)}
				<Popover.Close
					class={cn(
						'size-6 rounded-full transition-transform hover:scale-110',
						value === color && 'ring-2 ring-primary ring-offset-2 ring-offset-popover'
					)}
					style="background-color: {color}"
					aria-label={color}
					onclick={() => onpick(color)}
				/>
			{/each}

			<!-- Custom color: a native picker behind a rainbow swatch. It steals focus to
			     open the OS dialog (unlike the palette swatches), so stop the mousedown
			     from reaching a floating toolbar's focus-preserving handler. -->
			<label
				class="relative size-6 cursor-pointer overflow-hidden rounded-full ring-1 ring-foreground/10 transition-transform hover:scale-110"
				style="background: conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)"
				aria-label={m.color_picker_custom()}
			>
				<input
					type="color"
					value={value ?? '#888888'}
					onchange={pickCustom}
					onmousedown={(e) => e.stopPropagation()}
					class="absolute inset-0 cursor-pointer opacity-0"
				/>
			</label>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
