import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import type { Tag } from '$lib/models/tag';

// One tag = one node. Extends d3's datum so the simulation can write x/y/vx/vy/fx/fy.
export interface ForceNode extends SimulationNodeDatum {
	id: string; // lowercase tag name (matches graphService keys)
	tag: string; // original-case tag name, for selection callbacks
	label: string; // display name
	color: string;
	count: number; // note count, drives radius
	r: number;
}

// One co-occurrence pair = one link. source/target are ids before the
// simulation runs and node refs after d3 resolves them.
export interface ForceLink extends SimulationLinkDatum<ForceNode> {
	source: string | ForceNode;
	target: string | ForceNode;
	weight: number;
}

export interface TagCooccurrence {
	a: string;
	b: string;
	count: number;
}

// Canvas pan/zoom: screen = world * k + (x, y).
export interface Transform {
	k: number;
	x: number;
	y: number;
}

const MIN_R = 5;
const MAX_R = 22;

// Node radius scales with the square root of the note count so area, not
// radius, tracks the count. Clamped between MIN_R and MAX_R.
export function nodeRadiusFor(count: number, maxCount: number): number {
	if (maxCount <= 0) return MIN_R;
	const t = Math.sqrt(Math.max(0, count) / maxCount);
	return MIN_R + (MAX_R - MIN_R) * Math.min(1, t);
}

/**
 * Builds the node/link graph for the force view from the same data the
 * sunburst uses: every tag becomes a node, every co-occurrence a link.
 * Links whose endpoints are not known tags are dropped.
 */
export function buildForceGraph(
	tags: Tag[],
	cooccurrences: TagCooccurrence[],
	opts: {
		colorFor: (t: Tag) => string;
		labelFor: (t: Tag) => string;
		hideIsolated?: boolean;
	}
): { nodes: ForceNode[]; links: ForceLink[] } {
	const maxCount = tags.reduce((mx, t) => Math.max(mx, t.count), 0);
	let nodes: ForceNode[] = tags.map((t) => ({
		id: t.tag.toLowerCase(),
		tag: t.tag,
		label: opts.labelFor(t),
		color: opts.colorFor(t),
		count: t.count,
		r: nodeRadiusFor(t.count, maxCount)
	}));

	const known = new Set(nodes.map((n) => n.id));
	const links: ForceLink[] = [];
	for (const c of cooccurrences) {
		const a = c.a.toLowerCase();
		const b = c.b.toLowerCase();
		if (a !== b && known.has(a) && known.has(b)) {
			links.push({ source: a, target: b, weight: c.count });
		}
	}

	if (opts.hideIsolated) {
		const linked = new Set<string>();
		for (const l of links) {
			linked.add(linkEndId(l.source));
			linked.add(linkEndId(l.target));
		}
		nodes = nodes.filter((n) => linked.has(n.id));
	}

	return { nodes, links };
}

// A link endpoint is an id before the simulation runs, a node after.
export function linkEndId(end: string | ForceNode): string {
	return typeof end === 'string' ? end : end.id;
}

// id -> set of connected ids, for hover highlighting. Robust to whether
// d3 has resolved source/target to node refs yet.
export function buildAdjacency(links: ForceLink[]): Map<string, Set<string>> {
	const adj = new Map<string, Set<string>>();
	const add = (from: string, to: string) => {
		let set = adj.get(from);
		if (!set) adj.set(from, (set = new Set()));
		set.add(to);
	};
	for (const l of links) {
		const a = linkEndId(l.source);
		const b = linkEndId(l.target);
		add(a, b);
		add(b, a);
	}
	return adj;
}

export function screenToWorld(px: number, py: number, t: Transform): { x: number; y: number } {
	return { x: (px - t.x) / t.k, y: (py - t.y) / t.k };
}

export function worldToScreen(wx: number, wy: number, t: Transform): { x: number; y: number } {
	return { x: wx * t.k + t.x, y: wy * t.k + t.y };
}

// Topmost node whose circle contains the world point, or null.
export function findNodeAt(nodes: ForceNode[], wx: number, wy: number): ForceNode | null {
	for (let i = nodes.length - 1; i >= 0; i--) {
		const n = nodes[i];
		if (n.x == null || n.y == null) continue;
		const dx = wx - n.x;
		const dy = wy - n.y;
		if (dx * dx + dy * dy <= n.r * n.r) return n;
	}
	return null;
}
