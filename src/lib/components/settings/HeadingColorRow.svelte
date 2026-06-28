<script lang="ts">
	import { Button } from '$lib/components/shadcn/button/index.js';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';
	import { RotateCcwIcon, UnderlineIcon } from '@lucide/svelte';
	import { HEADING_METRICS } from '$lib/utils/cm/theme';

	let {
		level,
		title,
		ariaLabel,
		value,
		underline,
		onpick,
		onreset,
		onToggleUnderline
	}: {
		level: 1 | 2 | 3 | 4;
		title: string;
		ariaLabel: string;
		/** Current custom color, or `null` when using the primary color. */
		value: string | null;
		underline: boolean;
		onpick: (color: string) => void;
		onreset: () => void;
		onToggleUnderline: (underline: boolean) => void;
	} = $props();

	// Preview reads the very CSS variables the editor theme uses, so it always
	// matches how the heading actually renders (color, underline, font, size).
	const previewStyle = $derived.by(() => {
		const metrics = HEADING_METRICS[level];
		return `font-size: ${metrics.fontSize}; font-weight: ${metrics.fontWeight}; line-height: ${metrics.lineHeight}; color: var(--editor-h${level}-color, var(--primary)); text-decoration: var(--editor-h${level}-underline, none);`;
	});
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between gap-4">
		<div class="space-y-1.5">
			<p class="text-sm font-medium">{title}</p>
			<p class="text-xs text-muted-foreground">{m.settings_editor_heading_color_helper()}</p>
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
				triggerClass="size-6 rounded-full border-2 border-white bg-primary shadow-md transition-transform hover:scale-110 dark:border-white/70"
				triggerStyle={value ? `background-color: ${value}` : ''}
			/>

			<button
				type="button"
				onclick={() => onToggleUnderline(!underline)}
				aria-pressed={underline}
				aria-label={`${title} – ${m.settings_editor_underline()}`}
				class={cn(
					'flex size-7 items-center justify-center rounded-md border transition-colors',
					underline
						? 'border-primary bg-primary/10 text-primary'
						: 'border-border text-muted-foreground hover:bg-muted'
				)}
			>
				<UnderlineIcon size="15" />
			</button>
		</div>
	</div>

	<div
		class="rounded-md border bg-muted/30 px-3 py-2"
		style="font-family: var(--editor-font-family, var(--font-sans)); font-size: var(--editor-font-size, 16px);"
	>
		<span style={previewStyle}>{title}</span>
	</div>
</div>
