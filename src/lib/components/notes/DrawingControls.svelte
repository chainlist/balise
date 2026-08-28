<script lang="ts">
	import { CheckIcon, EraserIcon, XIcon } from '@lucide/svelte';
	import DrawingBrushIcon from './DrawingBrushIcon.svelte';
	import DrawingShapeSelect from './DrawingShapeSelect.svelte';
	import DrawingColorPick from './DrawingColorPick.svelte';
	import { drawingsService } from '$lib/services/drawings.svelte';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import { COLOR_PALETTE } from '$lib/utils/color-palette';
	import * as m from '$paraglide/messages.js';

	let { floating = true }: { floating?: boolean } = $props();

	// A distinct-hue subset of the shared accent palette.
	const BRUSH_COLORS = [...COLOR_PALETTE.slice(0, 4), ...COLOR_PALETTE.slice(6, 10)];
	const BRUSH_WIDTHS = [4, 7, 12];

	async function done() {
		try {
			await drawingsService.commit();
		} catch (e) {
			toasterService.error(m.drawing_save_error_failed(), errorMessage(e));
		}
	}
</script>

<div
	class="z-20 flex items-end {floating ? 'fixed right-5 bottom-0' : 'absolute right-3 bottom-0'}"
>
	{#if drawingsService.active}
		<div
			class="frost-surface! mb-5 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 shadow-lg select-none"
		>
			{#if drawingsService.tool === 'shape'}
				<DrawingColorPick
					label={m.editor_draw_fill()}
					value={drawingsService.shapeFill}
					onselect={(c) => (drawingsService.shapeFill = c)}
				/>
				<DrawingColorPick
					label={m.editor_draw_outline()}
					value={drawingsService.shapeColor}
					ring
					onselect={(c) => (drawingsService.shapeColor = c)}
				/>
			{:else}
				{#each BRUSH_COLORS as color (color)}
					<button
						type="button"
						aria-label="{m.editor_draw_color()} {color}"
						aria-pressed={drawingsService.color === color}
						class="flex size-5 items-center justify-center rounded-full transition-transform hover:scale-110 {drawingsService.color ===
						color
							? 'scale-110'
							: ''}"
						style="background: {color}"
						onclick={() => {
							drawingsService.color = color;
							drawingsService.tool = 'brush';
						}}
					>
						{#if drawingsService.color === color && drawingsService.tool === 'brush'}
							<CheckIcon class="size-3 text-white drop-shadow-sm" strokeWidth={3} />
						{/if}
					</button>
				{/each}
			{/if}
			<div class="mx-0.5 h-4 w-px bg-border"></div>
			<DrawingShapeSelect />
			<div class="mx-0.5 h-4 w-px bg-border"></div>
			{#each BRUSH_WIDTHS as w (w)}
				<button
					type="button"
					aria-label="{m.editor_draw_width()} {w}"
					aria-pressed={drawingsService.width === w}
					class="flex size-6 items-center justify-center rounded-full {drawingsService.width === w
						? 'bg-accent text-foreground'
						: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
					onclick={() => (drawingsService.width = w)}
				>
					<span class="rounded-full bg-current" style="width: {w}px; height: {w}px"></span>
				</button>
			{/each}
			<div class="mx-0.5 h-4 w-px bg-border"></div>
			<button
				type="button"
				aria-label={m.editor_draw_eraser()}
				aria-pressed={drawingsService.tool === 'eraser'}
				class="flex size-6 items-center justify-center rounded-full {drawingsService.tool ===
				'eraser'
					? 'bg-accent text-foreground'
					: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
				onclick={() =>
					(drawingsService.tool = drawingsService.tool === 'eraser' ? 'brush' : 'eraser')}
			>
				<EraserIcon class="size-4" />
			</button>
			<div class="mx-0.5 h-4 w-px bg-border"></div>
			<button
				type="button"
				aria-label={m.editor_draw_cancel()}
				class="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
				onclick={() => drawingsService.cancel()}
			>
				<XIcon class="size-4" />
			</button>
			<button
				type="button"
				class="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
				onclick={done}
			>
				{m.editor_draw_done()}
			</button>
		</div>
	{:else}
		<!-- A brush peeking up from the bottom edge of the page, its tip tinted with
		     the selected color; hovering slides it further up, clicking starts drawing. -->
		<button
			type="button"
			aria-label={m.editor_draw()}
			class="group block"
			onclick={() => drawingsService.start()}
		>
			<DrawingBrushIcon
				color={drawingsService.color}
				class="h-14 w-7 translate-y-6 drop-shadow-sm transition-transform duration-200 ease-out group-hover:translate-y-2"
			/>
		</button>
	{/if}
</div>
