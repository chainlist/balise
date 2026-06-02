<script lang="ts">
	import ForceGraph from 'force-graph';
	import type { Tag } from '$lib/models/tag';
	import type { GraphLink } from '$lib/services/tags.svelte';
	import { tagDisplayName } from '$lib/services/tags.svelte';
	import type { GraphSettings } from './types';

	// --- Types ---

	type FGNode = Tag & { id: string; degree: number; fx?: number; fy?: number };
	type FGLink = { source: string | FGNode; target: string | FGNode; weight: number };
	type Theme = { primary: string; foreground: string; outline: string };
	type RenderConfig = {
		theme: Theme;
		maxWeight: number;
		nodeSizeBy: 'count' | 'degree';
		selectedTag: string | null;
		neighborSet: Set<string> | null;
	};

	// --- Props ---

	let {
		nodes,
		links,
		settings,
		selectedTag = $bindable(null),
		onNavigate
	}: {
		nodes: Tag[];
		links: GraphLink[];
		settings: GraphSettings;
		selectedTag?: string | null;
		onNavigate: (tag: string) => void;
	} = $props();

	// --- State ---

	let containerEl: HTMLDivElement | undefined = $state();
	let graph = $state.raw<InstanceType<typeof ForceGraph<FGNode, FGLink>> | null>(null);
	let theme = $state<Theme>(defaultTheme());
	let firstFitDone = false;

	// --- Derived ---

	const filtered = $derived.by(() => {
		const minW = settings.minCooccurrence;
		const validLinks = links.filter((l) => l.weight >= minW);
		const degree = new Map<string, number>();
		for (const l of validLinks) {
			degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
			degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
		}
		let resultNodes: FGNode[] = nodes.map((n) => ({
			...n,
			id: n.tag,
			degree: degree.get(n.tag) ?? 0
		}));
		if (settings.hideIsolated) resultNodes = resultNodes.filter((n) => n.degree > 0);
		const visibleIds = new Set(resultNodes.map((n) => n.id));
		const resultLinks: FGLink[] = validLinks
			.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target))
			.map((l) => ({ source: l.source, target: l.target, weight: l.weight }));
		return { nodes: resultNodes, links: resultLinks };
	});

	const neighborSet = $derived.by(() => {
		if (!selectedTag) return null;
		const set = new Set<string>([selectedTag]);
		for (const l of filtered.links) {
			const s = typeof l.source === 'object' ? l.source.id : l.source;
			const t = typeof l.target === 'object' ? l.target.id : l.target;
			if (s === selectedTag) set.add(t);
			if (t === selectedTag) set.add(s);
		}
		return set;
	});

	const render = $derived<RenderConfig>({
		theme,
		maxWeight: filtered.links.reduce((m, l) => Math.max(m, l.weight), 1),
		nodeSizeBy: settings.nodeSizeBy,
		selectedTag,
		neighborSet
	});

	// --- Theme helpers ---

	function defaultTheme(): Theme {
		return { primary: '#7F77DD', foreground: '#1f1f1f', outline: '#888888' };
	}

	function resolveColor(cssColor: string): string {
		if (typeof document === 'undefined') return cssColor;
		const probe = document.createElement('div');
		probe.style.color = cssColor;
		probe.style.display = 'none';
		document.body.appendChild(probe);
		const resolved = getComputedStyle(probe).color;
		probe.remove();
		return resolved || cssColor;
	}

	function readTheme(): Theme {
		const cs = getComputedStyle(document.documentElement);
		return {
			primary: resolveColor(cs.getPropertyValue('--primary').trim() || '#7F77DD'),
			foreground: resolveColor(cs.getPropertyValue('--color-foreground').trim() || '#1f1f1f'),
			outline: resolveColor(cs.getPropertyValue('--outline-variant').trim() || '#888888')
		};
	}

	// --- Draw helpers ---

	function radiusFor(n: { count: number; degree: number }, nodeSizeBy: 'count' | 'degree'): number {
		const v = nodeSizeBy === 'count' ? n.count : n.degree;
		return 4 + Math.min(20, Math.sqrt(Math.max(0, v)) * 2.5);
	}

	function widthFor(weight: number, maxWeight: number): number {
		return 0.4 + Math.sqrt(weight / Math.max(1, maxWeight)) * 3;
	}

	function isNodeDimmed(n: FGNode, ns: Set<string> | null): boolean {
		return ns !== null && !ns.has(n.id);
	}

	function isLinkDimmed(l: FGLink, ns: Set<string> | null): boolean {
		if (!ns) return false;
		const sId = typeof l.source === 'object' ? l.source.id : l.source;
		const tId = typeof l.target === 'object' ? l.target.id : l.target;
		return !(ns.has(sId) && ns.has(tId));
	}

	// --- Canvas painters ---

	function paintNode(node: FGNode, ctx: CanvasRenderingContext2D, scale: number, r: RenderConfig) {
		if (node.x === undefined || node.y === undefined) return;
		const radius = radiusFor(node, r.nodeSizeBy);
		ctx.save();
		ctx.globalAlpha = isNodeDimmed(node, r.neighborSet) ? 0.25 : 1;
		ctx.fillStyle = node.color ?? r.theme.primary;
		ctx.beginPath();
		ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
		ctx.fill();
		if (r.selectedTag === node.id) {
			ctx.strokeStyle = r.theme.foreground;
			ctx.lineWidth = 2 / scale;
			ctx.stroke();
		}
		if (scale > 0.7) {
			const fontSize = 11 / scale;
			ctx.font = `${fontSize}px sans-serif`;
			ctx.fillStyle = r.theme.foreground;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.fillText(tagDisplayName(node), node.x, node.y + radius + 2 / scale);
		}
		ctx.restore();
	}

	function paintNodeHitArea(node: FGNode, color: string, ctx: CanvasRenderingContext2D, r: RenderConfig) {
		if (node.x === undefined || node.y === undefined) return;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(node.x, node.y, radiusFor(node, r.nodeSizeBy), 0, Math.PI * 2);
		ctx.fill();
	}

	function paintLink(link: FGLink, ctx: CanvasRenderingContext2D, r: RenderConfig) {
		const src = link.source;
		const tgt = link.target;
		if (typeof src !== 'object' || typeof tgt !== 'object') return;
		if (src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined) return;
		ctx.save();
		ctx.globalAlpha = isLinkDimmed(link, r.neighborSet) ? 0.08 : 0.45;
		ctx.strokeStyle = r.theme.outline;
		ctx.lineWidth = widthFor(link.weight, r.maxWeight);
		ctx.beginPath();
		ctx.moveTo(src.x, src.y);
		ctx.lineTo(tgt.x, tgt.y);
		ctx.stroke();
		ctx.restore();
	}

	// --- Interaction handlers ---

	function handleNodeClick(node: FGNode) {
		if (selectedTag === node.id) {
			onNavigate(node.id);
		} else {
			selectedTag = node.id;
		}
	}

	function handleBackgroundClick() {
		selectedTag = null;
	}

	// --- Effects ---

	// Instance lifecycle
	$effect(() => {
		if (!containerEl) return;
		theme = readTheme();
		firstFitDone = false;

		const instance = new ForceGraph<FGNode, FGLink>(containerEl);
		const rect = containerEl.getBoundingClientRect();
		instance
			.width(rect.width)
			.height(rect.height)
			.backgroundColor('transparent')
			.nodeId('id')
			.linkSource('source')
			.linkTarget('target')
			.nodeRelSize(4)
			.nodeLabel((n) => tagDisplayName(n))
			.nodeCanvasObjectMode(() => 'replace')
			.linkCanvasObjectMode(() => 'replace')
			.onNodeClick(handleNodeClick)
			.onBackgroundClick(handleBackgroundClick)
			.onNodeDragEnd((node: FGNode) => { node.fx = undefined; node.fy = undefined; })
			.onEngineStop(() => {
				if (firstFitDone) return;
				instance.zoomToFit(300, 40);
				firstFitDone = true;
			});

		const ro = new ResizeObserver((entries) => {
			const r = entries[0].contentRect;
			instance.width(r.width).height(r.height);
		});
		ro.observe(containerEl);

		const mo = new MutationObserver(() => {
			theme = readTheme();
		});
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		graph = instance;

		return () => {
			ro.disconnect();
			mo.disconnect();
			instance._destructor();
			graph = null;
		};
	});

	// Graph data
	$effect(() => {
		const g = graph;
		if (!g) return;
		firstFitDone = false;
		g.graphData({
			nodes: filtered.nodes.map((n) => ({ ...n })),
			links: filtered.links.map((l) => ({ source: l.source, target: l.target, weight: l.weight }))
		});
	});

	// Force settings
	$effect(() => {
		const g = graph;
		if (!g) return;
		const charge = g.d3Force('charge') as
			| (((alpha: number) => void) & { strength(s: number): unknown })
			| undefined;
		charge?.strength(settings.chargeStrength);
		const linkF = g.d3Force('link') as
			| (((alpha: number) => void) & {
					distance(d: number): unknown;
					strength(s: number): unknown;
			  })
			| undefined;
		linkF?.distance(settings.linkDistance);
		linkF?.strength(settings.linkStrength);
		g.d3ReheatSimulation();
	});

	// Canvas rendering
	$effect(() => {
		const g = graph;
		if (!g) return;
		const r = render;
		g.nodeCanvasObject((node, ctx, scale) => paintNode(node, ctx, scale, r));
		g.nodePointerAreaPaint((node, color, ctx) => paintNodeHitArea(node, color, ctx, r));
		g.linkCanvasObject((link, ctx) => paintLink(link, ctx, r));
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') handleBackgroundClick();
	}}
/>

<div bind:this={containerEl} class="relative h-full w-full overflow-hidden bg-background"></div>
