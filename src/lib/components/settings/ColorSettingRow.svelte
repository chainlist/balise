<script lang="ts">
	import { Button } from '$lib/components/shadcn/button/index.js';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';
	import { RotateCcwIcon } from '@lucide/svelte';

	let {
		title,
		description,
		ariaLabel,
		value,
		defaultClass,
		onpick,
		onreset
	}: {
		title: string;
		description: string;
		ariaLabel: string;
		/** Current custom color, or `null` when using the default. */
		value: string | null;
		/** Swatch background class shown when no custom color is set (e.g. `bg-primary`). */
		defaultClass: string;
		onpick: (color: string) => void;
		onreset: () => void;
	} = $props();
</script>

<div class="flex items-center justify-between gap-4">
	<div class="space-y-1.5">
		<p class="text-sm font-medium">{title}</p>
		<p class="text-xs text-muted-foreground">{description}</p>
	</div>
	<div class="flex items-center gap-2">
		{#if value}
			<Button variant="ghost" size="sm" class="text-muted-foreground" onclick={onreset}>
				<RotateCcwIcon size="14" />
				{m.settings_color_reset()}
			</Button>
		{/if}

		<ColorPicker
			{value}
			{onpick}
			triggerAriaLabel={ariaLabel}
			triggerClass={cn(
				'size-6 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 dark:border-white/70',
				defaultClass
			)}
			triggerStyle={value ? `background-color: ${value}` : ''}
		/>
	</div>
</div>
