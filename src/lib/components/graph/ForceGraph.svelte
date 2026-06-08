<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		forceSimulation,
		forceManyBody,
		forceLink,
		forceX,
		forceY,
		forceCollide,
		type Simulation
	} from 'd3-force';
	import * as m from '$paraglide/messages.js';
	import Tooltip from './Tooltip.svelte';
	import {
		buildAdjacency,
		findNodeAt,
		screenToWorld,
		type ForceNode,
		type ForceLink,
		type Transform
	} from './force-graph';

	let {
		nodes,
		links,
		selected,
		isDark,
		onSelect,
		onOpen
	}: {
		nodes: ForceNode[];
		links: ForceLink[];
		selected: string | null;
		isDark: boolean;
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

	// What the pointer/selection emphasises; null = nothing dimmed.
	function focusId(): string | null {
		return hoveredId ?? selectedId;
	}

	function nodeAlpha(id: string): number {
		const f = focusId();
		if (!f) return 1;
		if (id === f) return 1;
		return adjacency.get(f)?.has(id) ? 1 : 0.18;
	}

	function linkAlpha(a: string, b: string): number {
		const f = focusId();
		if (!f) return 0.5;
		return a === f || b === f ? 0.8 : 0.08;
	}

	function draw() {
		const ctx = canvas?.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, width, height);
		ctx.translate(transform.x, transform.y);
		ctx.scale(transform.k, transform.k);

		// Links
		ctx.lineCap = 'round';
		for (const l of links) {
			const s = l.source as ForceNode;
			const t = l.target as ForceNode;
			if (s.x == null || t.x == null) continue;
			ctx.globalAlpha = linkAlpha(s.id, t.id);
			ctx.strokeStyle = linkColor;
			ctx.lineWidth = Math.min(3, 0.5 + l.weight * 0.4);
			ctx.beginPath();
			ctx.moveTo(s.x, s.y!);
			ctx.lineTo(t.x, t.y!);
			ctx.stroke();
		}

		// Nodes + labels
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
		for (const n of nodes) {
			if (n.x == null || n.y == null) continue;
			const alpha = nodeAlpha(n.id);
			ctx.globalAlpha = alpha;
			ctx.beginPath();
			ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
			ctx.fillStyle = n.color;
			ctx.fill();
			if (n.id === selectedId) {
				ctx.lineWidth = 2;
				ctx.strokeStyle = labelColor;
				ctx.stroke();
			}
			// Labels: skip when zoomed far out unless this node is in focus.
			if (transform.k >= 0.6 || alpha === 1) {
				ctx.fillStyle = labelColor;
				ctx.fillText(n.label, n.x, n.y + n.r + 3);
			}
		}
		ctx.globalAlpha = 1;
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
		draw();
	}

	// (Re)build the simulation whenever the graph data changes. Reads size
	// untracked so a resize updates forces without resetting the layout.
	$effect(() => {
		const ns = nodes;
		const ls = links;
		adjacency = buildAdjacency(ls);

		// Deterministic seed ring around the center so the first frames look settled.
		// Read size untracked so a resize tweaks forces instead of rebuilding here.
		const c = untrack(centerWorld);
		ns.forEach((n, i) => {
			if (n.x == null) {
				const a = (i / Math.max(1, ns.length)) * Math.PI * 2;
				n.x = c.x + Math.cos(a) * 120;
				n.y = c.y + Math.sin(a) * 120;
			}
		});

		sim = forceSimulation<ForceNode, ForceLink>(ns)
			.force(
				'link',
				forceLink<ForceNode, ForceLink>(ls)
					.id((d) => d.id)
					.distance((d) => 30 + 60 / Math.sqrt(d.weight))
			)
			.force('charge', forceManyBody().strength(-380))
			// Gravity toward the center: forceX/forceY actually *pull* nodes back,
			// unlike forceCenter (which only recenters the centroid and lets the
			// cloud expand without bound while a node is pinned/dragged). Kept low
			// so clusters can spread; charge above does the separating.
			.force('x', forceX<ForceNode>(c.x).strength(0.045))
			.force('y', forceY<ForceNode>(c.y).strength(0.045))
			.force(
				'collide',
				forceCollide<ForceNode>().radius((d) => d.r + 4)
			)
			.on('tick', draw);

		return () => {
			sim?.stop();
			sim = null;
		};
	});

	// Keep the gravity centers aligned with the canvas size, without rebuilding.
	$effect(() => {
		const c = { x: width / 2 || 300, y: height / 2 || 300 };
		const fx = sim?.force('x') as ReturnType<typeof forceX<ForceNode>> | undefined;
		const fy = sim?.force('y') as ReturnType<typeof forceY<ForceNode>> | undefined;
		fx?.x(c.x);
		fy?.y(c.y);
		sim?.alpha(0.3).restart();
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
		draw();
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
