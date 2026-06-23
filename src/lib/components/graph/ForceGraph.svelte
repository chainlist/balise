<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { Simulation } from 'd3-force';
	import * as m from '$paraglide/messages.js';
	import Tooltip from './Tooltip.svelte';
	import {
		buildAdjacency,
		findNodeAt,
		screenToWorld,
		type ForceNode,
		type ForceLink,
		type Transform
	} from '$lib/domain/graph';
	import { drawGraph } from './force-render';
	import { createSimulation, setSimCenter, setSimTunables } from './force-sim';

	let {
		nodes,
		links,
		selected,
		isDark,
		repulsion,
		linkDistance,
		onSelect,
		onOpen
	}: {
		nodes: ForceNode[];
		links: ForceLink[];
		selected: string | null;
		isDark: boolean;
		repulsion: number;
		linkDistance: number;
		onSelect: (tag: string | null) => void;
		onOpen: (tag: string) => void;
	} = $props();

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let width = $state(0);
	let height = $state(0);
	let dpr = 1;

	let transform = $state<Transform>({ k: 1, x: 0, y: 0 });
	let hoveredId = $state<string | null>(null);
	let mouse = $state({ x: 0, y: 0 });

	let sim: Simulation<ForceNode, ForceLink> | null = null;
	let adjacency = new Map<string, Set<string>>();

	// Interaction state (plain, not reactive — read inside event handlers only).
	let dragNode: ForceNode | null = null;
	let panning = false;
	let moved = false;
	let pointerStart = { x: 0, y: 0 };
	let panStart = { tx: 0, ty: 0 };
	const DRAG_THRESHOLD = 4;

	const selectedId = $derived(selected?.toLowerCase() ?? null);

	// Neutral colors for links/labels, mirroring graph-colors.ts light/dark split.
	const linkColor = $derived(isDark ? '#5a5a66' : '#c8c8d0');
	const labelColor = $derived(isDark ? '#d4d4dc' : '#3a3a42');

	function centerWorld(): { x: number; y: number } {
		return { x: width / 2 || 300, y: height / 2 || 300 };
	}

	// Coalesce every redraw trigger (sim ticks, hover, pan/zoom) into at most one
	// paint per animation frame. A burst of mousemove events in a single frame
	// then costs one draw, not one per event.
	let rafId = 0;
	function scheduleDraw() {
		if (rafId) return;
		rafId = requestAnimationFrame(() => {
			rafId = 0;
			draw();
		});
	}

	function draw() {
		const ctx = canvas?.getContext('2d');
		if (!ctx) return;
		drawGraph(ctx, {
			nodes,
			links,
			transform,
			dpr,
			width,
			height,
			// While a tag is selected it stays the focus; hovering other nodes must
			// not steal the highlight. Hover only drives focus when nothing is selected.
			focus: selectedId ?? hoveredId,
			selectedId,
			adjacency,
			linkColor,
			labelColor
		});
	}

	function resize() {
		const rect = container.getBoundingClientRect();
		width = rect.width;
		height = rect.height;
		dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		scheduleDraw();
	}

	// (Re)build the simulation whenever the graph data changes. Size and the
	// spread tunables are read untracked: a resize or slider change is applied
	// live by the dedicated effects below instead of rebuilding (which would
	// reset the layout).
	$effect(() => {
		const ns = nodes;
		const ls = links;
		adjacency = buildAdjacency(ls);

		sim = createSimulation(ns, ls, {
			center: untrack(centerWorld),
			repulsion: untrack(() => repulsion),
			linkDistance: untrack(() => linkDistance),
			onTick: scheduleDraw
		});

		return () => {
			sim?.stop();
			sim = null;
		};
	});

	// Keep the gravity centers aligned with the canvas size, without rebuilding.
	$effect(() => {
		setSimCenter(sim, { x: width / 2 || 300, y: height / 2 || 300 });
	});

	// Apply the spread sliders live, without rebuilding (keeps node positions).
	$effect(() => {
		setSimTunables(sim, { repulsion, linkDistance });
	});

	// Pin the selected node to the center as the "hub"; release others.
	$effect(() => {
		const sel = selectedId;
		const c = centerWorld();
		for (const n of nodes) {
			if (n.id === sel) {
				n.fx = c.x;
				n.fy = c.y;
			} else if (n !== dragNode) {
				n.fx = null;
				n.fy = null;
			}
		}
		sim?.alpha(0.4).restart();
	});

	// Redraw on theme change.
	$effect(() => {
		void isDark;
		void transform;
		void hoveredId;
		scheduleDraw();
	});

	function localPoint(e: MouseEvent): { x: number; y: number } {
		const rect = canvas.getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

	function handleDown(e: MouseEvent) {
		const p = localPoint(e);
		pointerStart = p;
		moved = false;
		const w = screenToWorld(p.x, p.y, transform);
		const node = findNodeAt(nodes, w.x, w.y);
		if (node) {
			dragNode = node;
			node.fx = node.x;
			node.fy = node.y;
			sim?.alphaTarget(0.3).restart();
		} else {
			panning = true;
			panStart = { tx: transform.x, ty: transform.y };
		}
	}

	function handleMove(e: MouseEvent) {
		const p = localPoint(e);
		mouse = p;
		if (Math.hypot(p.x - pointerStart.x, p.y - pointerStart.y) > DRAG_THRESHOLD) moved = true;

		if (dragNode) {
			const w = screenToWorld(p.x, p.y, transform);
			dragNode.fx = w.x;
			dragNode.fy = w.y;
		} else if (panning) {
			transform = {
				k: transform.k,
				x: panStart.tx + (p.x - pointerStart.x),
				y: panStart.ty + (p.y - pointerStart.y)
			};
		} else {
			const w = screenToWorld(p.x, p.y, transform);
			hoveredId = findNodeAt(nodes, w.x, w.y)?.id ?? null;
			canvas.style.cursor = hoveredId ? 'pointer' : 'grab';
		}
	}

	function endInteraction() {
		if (dragNode) {
			// Keep the hub pinned; release everything else back to the simulation.
			if (dragNode.id !== selectedId) {
				dragNode.fx = null;
				dragNode.fy = null;
			} else {
				const c = centerWorld();
				dragNode.fx = c.x;
				dragNode.fy = c.y;
			}
			sim?.alphaTarget(0);
		}
		dragNode = null;
		panning = false;
	}

	function handleLeave() {
		hoveredId = null;
		endInteraction();
	}

	function handleClick(e: MouseEvent) {
		if (moved) return;
		const p = localPoint(e);
		const w = screenToWorld(p.x, p.y, transform);
		const node = findNodeAt(nodes, w.x, w.y);
		onSelect(node ? node.tag : null);
	}

	function handleDblClick(e: MouseEvent) {
		const p = localPoint(e);
		const w = screenToWorld(p.x, p.y, transform);
		const node = findNodeAt(nodes, w.x, w.y);
		if (node) onOpen(node.tag);
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const p = localPoint(e);
		const before = screenToWorld(p.x, p.y, transform);
		const k = Math.min(5, Math.max(0.2, transform.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
		transform = { k, x: p.x - before.x * k, y: p.y - before.y * k };
	}

	const tip = $derived.by(() => {
		if (!hoveredId) return null;
		const n = nodes.find((x) => x.id === hoveredId);
		if (!n) return null;
		return { title: n.label, sub: m.graph_arc_notes({ count: n.count }) };
	});
	const tipX = $derived(Math.max(8, Math.min(mouse.x + 14, width - 232)));
	const tipY = $derived(Math.max(4, mouse.y - 36));

	onMount(() => {
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(container);
		// Non-passive wheel listener so we can preventDefault the page scroll.
		canvas.addEventListener('wheel', handleWheel, { passive: false });
		return () => {
			ro.disconnect();
			canvas.removeEventListener('wheel', handleWheel);
			if (rafId) cancelAnimationFrame(rafId);
		};
	});
</script>

<div bind:this={container} class="relative h-full w-full overflow-hidden">
	<canvas
		bind:this={canvas}
		class="block touch-none"
		style="cursor: grab;"
		onmousedown={handleDown}
		onmousemove={handleMove}
		onmouseup={endInteraction}
		onmouseleave={handleLeave}
		onclick={handleClick}
		ondblclick={handleDblClick}
	></canvas>

	{#if tip}
		<Tooltip title={tip.title} sub={tip.sub} x={tipX} y={tipY} />
	{/if}
</div>
