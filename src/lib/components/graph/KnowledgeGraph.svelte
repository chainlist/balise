<script lang="ts">
	import ForceGraph from 'force-graph';
	import type { Tag } from '$lib/models/tag';
	import type { GraphLink } from '$lib/services/tags.svelte';
	import { tagDisplayName } from '$lib/services/tags.svelte';
	import type { GraphSettings } from './types';

	type FGNode = Tag & { id: string; degree: number };
	type FGLink = { source: string | FGNode; target: string | FGNode; weight: number };

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

	let containerEl: HTMLDivElement | undefined = $state();
	let graph = $state.raw<InstanceType<typeof ForceGraph<FGNode, FGLink>> | null>(null);

	let pendingClickTimer: number | null = null;
	let pendingClickNodeId: string | null = null;
	const DBLCLICK_MS = 250;

	let theme = $state(defaultTheme());
	let firstFitDone = false;

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
		if (settings.hideIsolated) {
			resultNodes = resultNodes.filter((n) => n.degree > 0);
		}
		const visibleIds = new Set(resultNodes.map((n) => n.id));
		const resultLinks: FGLink[] = validLinks
			.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target))
			.map((l) => ({ source: l.source, target: l.target, weight: l.weight }));
		return { nodes: resultNodes, links: resultLinks };
	});

	const maxWeight = $derived(filtered.links.reduce((m, l) => Math.max(m, l.weight), 1));

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

	function defaultTheme() {
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

	function readTheme() {
		const cs = getComputedStyle(document.documentElement);
		return {
			primary: resolveColor(cs.getPropertyValue('--primary').trim() || '#7F77DD'),
			foreground: resolveColor(cs.getPropertyValue('--foreground').trim() || '#1f1f1f'),
			outline: resolveColor(cs.getPropertyValue('--outline-variant').trim() || '#888888')
		};
	}

	function radiusFor(n: { count: number; degree: number }): number {
		const v = settings.nodeSizeBy === 'count' ? n.count : n.degree;
		return 4 + Math.min(20, Math.sqrt(Math.max(0, v)) * 2.5);
	}

	function widthFor(weight: number): number {
		return 0.4 + Math.sqrt(weight / Math.max(1, maxWeight)) * 3;
	}

	function isNodeDimmed(n: FGNode): boolean {
		return neighborSet !== null && !neighborSet.has(n.id);
	}

	function isLinkDimmed(l: FGLink): boolean {
		if (!neighborSet) return false;
		const sId = typeof l.source === 'object' ? l.source.id : l.source;
		const tId = typeof l.target === 'object' ? l.target.id : l.target;
		return !(neighborSet.has(sId) && neighborSet.has(tId));
	}

	function handleNodeClick(node: FGNode) {
		if (pendingClickTimer !== null && pendingClickNodeId === node.id) {
			clearTimeout(pendingClickTimer);
			pendingClickTimer = null;
			pendingClickNodeId = null;
			onNavigate(node.id);
			return;
		}
		if (pendingClickTimer !== null) {
			clearTimeout(pendingClickTimer);
		}
		pendingClickNodeId = node.id;
		pendingClickTimer = window.setTimeout(() => {
			selectedTag = selectedTag === node.id ? null : node.id;
			pendingClickTimer = null;
			pendingClickNodeId = null;
		}, DBLCLICK_MS);
	}

	function handleBackgroundClick() {
		if (pendingClickTimer !== null) {
			clearTimeout(pendingClickTimer);
			pendingClickTimer = null;
			pendingClickNodeId = null;
		}
		selectedTag = null;
	}

	function clearPendingClick() {
		if (pendingClickTimer !== null) {
			clearTimeout(pendingClickTimer);
			pendingClickTimer = null;
			pendingClickNodeId = null;
		}
	}

	$effect(() => {
		if (!containerEl) return;

		theme = readTheme();

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
			clearPendingClick();
			ro.disconnect();
			mo.disconnect();
			instance._destructor();
			graph = null;
		};
	});

	$effect(() => {
		const g = graph;
		if (!g) return;
		const data = {
			nodes: filtered.nodes.map((n) => ({ ...n })),
			links: filtered.links.map((l) => ({ source: l.source, target: l.target, weight: l.weight }))
		};
		g.graphData(data);
	});

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

	$effect(() => {
		const g = graph;
		if (!g) return;
		void settings.nodeSizeBy;
		void selectedTag;
		void neighborSet;
		void theme;
		void maxWeight;

		g.nodeCanvasObject((node, ctx, scale) => {
			if (node.x === undefined || node.y === undefined) return;
			const r = radiusFor(node);
			const dimmed = isNodeDimmed(node);
			ctx.save();
			ctx.globalAlpha = dimmed ? 0.25 : 1;
			ctx.fillStyle = node.color ?? theme.primary;
			ctx.beginPath();
			ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
			ctx.fill();
			if (selectedTag === node.id) {
				ctx.strokeStyle = theme.foreground;
				ctx.lineWidth = 2 / scale;
				ctx.stroke();
			}
			if (scale > 0.7) {
				const fontSize = 11 / scale;
				ctx.font = `${fontSize}px sans-serif`;
				ctx.fillStyle = theme.foreground;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';
				ctx.fillText(tagDisplayName(node), node.x, node.y + r + 2 / scale);
			}
			ctx.restore();
		});

		g.nodePointerAreaPaint((node, color, ctx) => {
			if (node.x === undefined || node.y === undefined) return;
			const r = radiusFor(node);
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
			ctx.fill();
		});

		g.linkCanvasObject((link, ctx) => {
			const src = link.source;
			const tgt = link.target;
			if (typeof src !== 'object' || typeof tgt !== 'object') return;
			if (src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined)
				return;
			const dimmed = isLinkDimmed(link);
			ctx.save();
			ctx.globalAlpha = dimmed ? 0.08 : 0.45;
			ctx.strokeStyle = theme.outline;
			ctx.lineWidth = widthFor(link.weight);
			ctx.beginPath();
			ctx.moveTo(src.x, src.y);
			ctx.lineTo(tgt.x, tgt.y);
			ctx.stroke();
			ctx.restore();
		});
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') handleBackgroundClick();
	}}
/>

<div bind:this={containerEl} class="bg-background relative h-full w-full overflow-hidden"></div>
