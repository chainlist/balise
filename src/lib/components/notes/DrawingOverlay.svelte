<script lang="ts">
	import { drawingsService } from '$lib/services/drawings.svelte';
	import type { StrokePoint } from '$lib/domain/drawing';
	import type { Shape } from '$lib/domain/shape';
	import { strokePath } from './drawing-path';
	import { shapePath, shapeFillAttr } from './shape-path';
	import DrawingEditHandle from './DrawingEditHandle.svelte';
	import * as m from '$paraglide/messages.js';

	let root = $state<HTMLDivElement>();
	let width = $state(0);
	let height = $state(0);
	let current = $state<StrokePoint[]>([]);
	let currentShape = $state<Shape | null>(null);
	let drawing = false;
	let erasing = false;
	let shaping = false;
	let shapeStart = { x: 0, y: 0 };

	const active = $derived(drawingsService.active);
	const shown = $derived(active ? drawingsService.working : drawingsService.drawings);
	const centerX = $derived(width / 2);

	// The overlay is a zero-height layer with visible overflow so committed
	// drawings always paint; entering draw mode stretches it over the full note
	// content to catch pointer input anywhere. The editor can't change while the
	// overlay captures the pointer, so measuring once per activation is enough.
	$effect(() => {
		if (active && root) height = root.parentElement?.scrollHeight ?? 0;
	});

	// Escape (or the cancel button) can end draw mode mid-gesture; drop the
	// in-progress stroke or shape so it doesn't linger painted over the note.
	$effect(() => {
		if (active) return;
		drawing = false;
		erasing = false;
		shaping = false;
		current = [];
		currentShape = null;
	});

	// Capture phase so Escape / undo / redo don't also reach the text editor
	// while draw mode is on.
	$effect(() => {
		if (!active) return;
		const onKey = (e: KeyboardEvent) => {
			const key = e.key.toLowerCase();
			if (e.key === 'Escape') {
				drawingsService.cancel();
			} else if ((e.ctrlKey || e.metaKey) && key === 'z') {
				if (e.shiftKey) drawingsService.redo();
				else drawingsService.undo();
			} else if ((e.ctrlKey || e.metaKey) && key === 'y') {
				drawingsService.redo();
			} else {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	});

	function toPoint(e: PointerEvent): StrokePoint {
		const rect = root!.getBoundingClientRect();
		return { x: e.clientX - rect.left - width / 2, y: e.clientY - rect.top, p: e.pressure };
	}

	function onpointerdown(e: PointerEvent) {
		if (e.button !== 0) return;
		root!.setPointerCapture(e.pointerId);
		if (drawingsService.tool === 'eraser') {
			erasing = true;
			drawingsService.startGesture();
			drawingsService.erase(toPoint(e));
		} else if (drawingsService.tool === 'shape') {
			shaping = true;
			shapeStart = toPoint(e);
			currentShape = null;
		} else {
			drawing = true;
			current = [toPoint(e)];
		}
	}

	function onpointermove(e: PointerEvent) {
		if (drawing) current = [...current, toPoint(e)];
		else if (erasing) drawingsService.erase(toPoint(e));
		else if (shaping) {
			const p = toPoint(e);
			currentShape = {
				kind: drawingsService.shape,
				x: shapeStart.x,
				y: shapeStart.y,
				w: p.x - shapeStart.x,
				h: p.y - shapeStart.y,
				color: drawingsService.shapeColor,
				fill: drawingsService.shapeFill,
				size: drawingsService.width
			};
		}
	}

	function onpointerup() {
		if (drawing) {
			drawing = false;
			if (current.length > 1) drawingsService.addStroke(current);
			current = [];
		}
		if (shaping) {
			shaping = false;
			// Ignore accidental clicks that never dragged out a visible shape.
			if (currentShape && (Math.abs(currentShape.w) >= 8 || Math.abs(currentShape.h) >= 8)) {
				drawingsService.addShape(currentShape);
			}
			currentShape = null;
		}
		erasing = false;
	}
</script>

<div
	bind:this={root}
	bind:clientWidth={width}
	role="application"
	aria-label={m.editor_draw()}
	class="absolute top-0 left-0 z-10 w-full overflow-visible {active
		? 'cursor-crosshair touch-none'
		: 'pointer-events-none'}"
	style="height: {active ? `${height}px` : '0'}"
	onpointerdown={active ? onpointerdown : undefined}
	onpointermove={active ? onpointermove : undefined}
	onpointerup={active ? onpointerup : undefined}
	onpointercancel={active ? onpointerup : undefined}
>
	<!-- Height stays 1px: a zero-sized svg disables rendering entirely, while a
	     1px viewport with visible overflow always paints the strokes, whether or
	     not the wrapper is stretched for draw mode. -->
	<svg class="pointer-events-none block w-full overflow-visible" height="1" aria-hidden="true">
		<g transform="translate({centerX} 0)">
			{#each shown as d (d.id)}
				<g transform="translate({d.x} {d.y})">
					{#each d.shapes as shape, i (i)}
						<path
							d={shapePath(shape)}
							fill={shapeFillAttr(shape)}
							stroke={shape.color}
							stroke-width={shape.size}
							stroke-linejoin="round"
							stroke-linecap="round"
						/>
					{/each}
					{#each d.strokes as stroke, i (i)}
						<path d={strokePath(stroke.points, stroke.size)} fill={stroke.color ?? d.color} />
					{/each}
				</g>
			{/each}
			{#if current.length > 0}
				<path d={strokePath(current, drawingsService.width)} fill={drawingsService.color} />
			{/if}
			{#if currentShape}
				<path
					d={shapePath(currentShape)}
					fill={shapeFillAttr(currentShape)}
					stroke={currentShape.color}
					stroke-width={currentShape.size}
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
			{/if}
		</g>
	</svg>
	{#if active}
		{#each drawingsService.working as d (d.id)}
			<DrawingEditHandle drawing={d} {centerX} />
		{/each}
	{/if}
</div>
