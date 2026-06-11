import type { ForceNode, ForceLink, Transform } from './force-graph';

// `focus` is what the pointer/selection emphasises; null = nothing dimmed.
export function nodeAlpha(
	id: string,
	focus: string | null,
	adjacency: Map<string, Set<string>>
): number {
	if (!focus) return 1;
	if (id === focus) return 1;
	return adjacency.get(focus)?.has(id) ? 1 : 0.18;
}

export function linkAlpha(a: string, b: string, focus: string | null): number {
	if (!focus) return 0.5;
	return a === focus || b === focus ? 0.8 : 0.08;
}

export interface DrawOptions {
	nodes: ForceNode[];
	links: ForceLink[];
	transform: Transform;
	dpr: number;
	width: number;
	height: number;
	focus: string | null;
	selectedId: string | null;
	adjacency: Map<string, Set<string>>;
	linkColor: string;
	labelColor: string;
}

export function drawGraph(ctx: CanvasRenderingContext2D, o: DrawOptions): void {
	const { nodes, links, transform, focus, adjacency } = o;
	ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
	ctx.clearRect(0, 0, o.width, o.height);
	ctx.translate(transform.x, transform.y);
	ctx.scale(transform.k, transform.k);

	// Links
	ctx.lineCap = 'round';
	for (const l of links) {
		const s = l.source as ForceNode;
		const t = l.target as ForceNode;
		if (s.x == null || t.x == null) continue;
		ctx.globalAlpha = linkAlpha(s.id, t.id, focus);
		ctx.strokeStyle = o.linkColor;
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
		const alpha = nodeAlpha(n.id, focus, adjacency);
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
		ctx.fillStyle = n.color;
		ctx.fill();
		if (n.id === o.selectedId) {
			ctx.lineWidth = 2;
			ctx.strokeStyle = o.labelColor;
			ctx.stroke();
		}
		// Labels: skip when zoomed far out unless this node is in focus.
		if (transform.k >= 0.6 || alpha === 1) {
			ctx.fillStyle = o.labelColor;
			ctx.fillText(n.label, n.x, n.y + n.r + 3);
		}
	}
	ctx.globalAlpha = 1;
}
