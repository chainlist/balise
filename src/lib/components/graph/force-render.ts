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
	const k = transform.k;
	ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
	ctx.clearRect(0, 0, o.width, o.height);
	ctx.translate(transform.x, transform.y);
	ctx.scale(k, k);

	// Visible world rect (== screenToWorld of the canvas corners). When zoomed in
	// most of the graph is off-screen, so culling against this keeps the per-frame
	// cost tied to what's actually shown, not to the whole node/link count.
	const minX = -transform.x / k;
	const minY = -transform.y / k;
	const maxX = (o.width - transform.x) / k;
	const maxY = (o.height - transform.y) / k;

	// Links
	ctx.lineCap = 'round';
	for (const l of links) {
		const s = l.source as ForceNode;
		const t = l.target as ForceNode;
		if (s.x == null || t.x == null) continue;
		// Skip segments whose bounding box is fully outside the viewport.
		if (Math.max(s.x, t.x) < minX || Math.min(s.x, t.x) > maxX) continue;
		if (Math.max(s.y!, t.y!) < minY || Math.min(s.y!, t.y!) > maxY) continue;
		ctx.globalAlpha = linkAlpha(s.id, t.id, focus);
		ctx.strokeStyle = o.linkColor;
		// Width is held constant in screen pixels (÷k): zooming in must not inflate
		// every edge into a thick band, which is what blows up the fill cost on a
		// dense graph.
		ctx.lineWidth = Math.min(3, 0.5 + l.weight * 2.5) / k;
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
		// Skip nodes whose circle is fully outside the viewport (also skips their label).
		if (n.x + n.r < minX || n.x - n.r > maxX || n.y + n.r < minY || n.y - n.r > maxY) continue;
		const alpha = nodeAlpha(n.id, focus, adjacency);
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
		ctx.fillStyle = n.color;
		ctx.fill();
		if (n.id === o.selectedId) {
			ctx.lineWidth = 2 / k;
			ctx.strokeStyle = o.labelColor;
			ctx.stroke();
		}
		// Labels: skip when zoomed far out unless this node is in focus.
		if (k >= 0.6 || alpha === 1) {
			ctx.fillStyle = o.labelColor;
			ctx.fillText(n.label, n.x, n.y + n.r + 3);
		}
	}
	ctx.globalAlpha = 1;
}
