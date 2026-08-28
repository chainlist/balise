<script lang="ts">
	import { MoveIcon, Trash2Icon } from '@lucide/svelte';
	import { drawingsService } from '$lib/services/drawings.svelte';
	import { drawingBounds, type Drawing } from '$lib/domain/drawing';
	import * as m from '$paraglide/messages.js';

	let { drawing, centerX }: { drawing: Drawing; centerX: number } = $props();

	const bounds = $derived(drawingBounds(drawing));

	let moveButton = $state<HTMLButtonElement>();
	let dragging = $state(false);
	let last = { x: 0, y: 0 };

	function onpointerdown(e: PointerEvent) {
		e.stopPropagation();
		moveButton?.setPointerCapture(e.pointerId);
		dragging = true;
		drawingsService.startGesture();
		last = { x: e.clientX, y: e.clientY };
	}

	function onpointermove(e: PointerEvent) {
		if (!dragging) return;
		drawingsService.move(drawing.id, e.clientX - last.x, e.clientY - last.y);
		last = { x: e.clientX, y: e.clientY };
	}

	function onpointerup() {
		dragging = false;
	}
</script>

<!-- Dashed outline showing the drawing's extent, only while it is being moved. -->
{#if dragging}
	<div
		class="pointer-events-none absolute rounded border border-dashed border-muted-foreground/40"
		style="left: {centerX + bounds.left - 6}px; top: {bounds.top - 6}px;
		       width: {bounds.right - bounds.left + 12}px; height: {bounds.bottom - bounds.top + 12}px"
	></div>
{/if}

<!-- Edit chip pinned above the drawing: drag the grip to move it, trash deletes. -->
<div
	role="toolbar"
	tabindex="-1"
	class="frost-surface! absolute flex items-center gap-0.5 rounded p-0.5 select-none"
	style="left: {centerX + bounds.left - 6}px; top: {bounds.top - 34}px"
	onpointerdown={(e) => e.stopPropagation()}
>
	<button
		type="button"
		bind:this={moveButton}
		aria-label={m.editor_draw_move()}
		class="flex size-6 touch-none items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground {dragging
			? 'cursor-grabbing'
			: 'cursor-grab'}"
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		onpointercancel={onpointerup}
	>
		<MoveIcon class="size-3.5" />
	</button>
	<button
		type="button"
		aria-label={m.action_delete()}
		class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-destructive"
		onclick={() => drawingsService.remove(drawing.id)}
	>
		<Trash2Icon class="size-3.5" />
	</button>
</div>
