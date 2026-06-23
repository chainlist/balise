// Graph domain: the tag co-occurrence graph connects subjects (tags), never note
// to note. Edge weighting, per-tag scoring, ranking, neighbour adjacency, and
// colour mapping are pure rules, no I/O, no Svelte, no Tauri. The service feeds
// these builders the tags and the loaded co-occurrence rows and exposes the
// derived structures the graph views consume.

import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import type { Tag } from './tag';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TagCooccurrence {
	tagA: string;
	tagB: string;
	/** Notes carrying both tags. */
	count: number;
	/** Each tag's own note count over the same (non-archived) population. */
	countA: number;
	countB: number;
}

export interface TagNeighbor {
	tag: Tag;
	weight: number;
}

export interface WeightedEdge {
	a: string;
	b: string;
	weight: number;
}

// ─── Edge weighting ───────────────────────────────────────────────────────────

/**
 * Jaccard overlap between two tags: shared notes / notes carrying either tag.
 * `countAB` is the number of notes carrying both; `countA` / `countB` are each
 * tag's own note count. Returns a 0..1 strength where 1 means the two tags
 * always appear together. A tag that sits on almost everything drags the union
 * up, so its incidental co-occurrences score low - which is the whole point.
 */
export function jaccardWeight(countA: number, countB: number, countAB: number): number {
	const union = countA + countB - countAB;
	return union > 0 ? countAB / union : 0;
}

// ─── Colours ──────────────────────────────────────────────────────────────────

export const DEFAULT_TAG_COLOR = '#7F77DD';

const PALETTE_LIGHT = [
	'#7F77DD',
	'#1D9E75',
	'#D85A30',
	'#378ADD',
	'#9333EA',
	'#E0A30E',
	'#D6336C',
	'#0CA678'
];

const PALETTE_DARK = [
	'#AFA9EC',
	'#5DCAA5',
	'#F0997B',
	'#85B7EB',
	'#C084FC',
	'#F5CF5B',
	'#F06595',
	'#38D9A9'
];

export function assignGraphColors(tags: Tag[], isDark: boolean): Record<string, string> {
	const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
	const map: Record<string, string> = {};
	tags.forEach((t, i) => {
		map[t.tag.toLowerCase()] =
			t.color && t.color.toUpperCase() !== DEFAULT_TAG_COLOR.toUpperCase()
				? t.color
				: palette[i % palette.length];
	});
	return map;
}

// ─── Scoring, ranking, adjacency ────────────────────────────────────────────────

/** Total co-occurrence weight per tag, keyed by lowercase name. */
export function buildScores(tags: Tag[], cooccurrences: TagCooccurrence[]): Record<string, number> {
	const score: Record<string, number> = {};
	for (const t of tags) score[t.tag.toLowerCase()] = 0;
	for (const c of cooccurrences) {
		const a = c.tagA.toLowerCase();
		const b = c.tagB.toLowerCase();
		if (a in score) score[a] += c.count;
		if (b in score) score[b] += c.count;
	}
	return score;
}

/** Adjacency index: tag (lowercase) -> neighbour list sorted by weight, strongest first. */
export function buildNeighbors(
	tags: Tag[],
	cooccurrences: TagCooccurrence[]
): Record<string, TagNeighbor[]> {
	const byLower: Record<string, Tag> = {};
	for (const t of tags) byLower[t.tag.toLowerCase()] = t;

	const map: Record<string, TagNeighbor[]> = {};
	for (const c of cooccurrences) {
		const a = c.tagA.toLowerCase();
		const b = c.tagB.toLowerCase();
		const tagA = byLower[a];
		const tagB = byLower[b];
		if (tagA && tagB) {
			const weight = jaccardWeight(c.countA, c.countB, c.count);
			(map[a] ??= []).push({ tag: tagB, weight });
			(map[b] ??= []).push({ tag: tagA, weight });
		}
	}
	for (const key in map) map[key].sort((x, y) => y.weight - x.weight);
	return map;
}

/** All tags ordered by total co-occurrence weight (most connected first), ties by name. */
export function rankTags(tags: Tag[], scores: Record<string, number>): Tag[] {
	return [...tags].sort((x, y) => {
		const d = (scores[y.tag.toLowerCase()] ?? 0) - (scores[x.tag.toLowerCase()] ?? 0);
		return d !== 0 ? d : x.tag.localeCompare(y.tag, undefined, { sensitivity: 'base' });
	});
}

/** Co-occurrence edges weighted by Jaccard overlap (0..1), for the force view. */
export function weightedEdges(cooccurrences: TagCooccurrence[]): WeightedEdge[] {
	return cooccurrences.map((c) => ({
		a: c.tagA,
		b: c.tagB,
		weight: jaccardWeight(c.countA, c.countB, c.count)
	}));
}

/**
 * Tags co-occurring with `name`, strongest first, optionally filtered by a
 * minimum 0..1 Jaccard strength. `minStrength` 0 shows every connection.
 * Takes the prebuilt adjacency from `buildNeighbors` so the lookup stays O(1).
 */
export function neighborsOf(
	neighbors: Record<string, TagNeighbor[]>,
	name: string,
	minStrength = 0
): TagNeighbor[] {
	const list = neighbors[name.toLowerCase()] ?? [];
	return minStrength <= 0 ? list : list.filter((n) => n.weight >= minStrength);
}

// ─── Sunburst geometry ────────────────────────────────────────────────────────
// Pure layout math for the sunburst view: arc placement, related-tag dots, and
// the chords between co-occurring arcs. Moved out of the component (Concept 09);
// the SVG components consume these, the math itself has no reactivity or DOM.

export interface SunburstRelatedTag {
	label: string;
	color: string;
	weight: number;
}

export interface SunburstArc {
	label: string;
	noteCount: number;
	color: string;
	relatedTags: SunburstRelatedTag[];
	isSelected?: boolean;
}

export const SIZE = 600;
export const C = SIZE / 2;
export const RC = 62; // center circle radius
export const RI = 148; // arc inner radius
export const RO = 230; // arc outer radius
export const RD = 268; // related-dot ring radius
export const GAP = 0.04; // radians between arcs
export const MAX_DOTS = 5;
export const DOT_STEP = 0.09; // radians between related-tag dots

export function polar(r: number, a: number): [number, number] {
	return [C + Math.cos(a) * r, C + Math.sin(a) * r];
}

export function ra(hex: string, op: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${op})`;
}

export type LayoutItem = {
	arc: SunburstArc;
	i: number;
	a0: number;
	a1: number;
	mid: number;
	span: number;
	dots: { rt: SunburstRelatedTag; x: number; y: number; r: number }[];
	badge: { count: number; x: number; y: number } | null;
	label: { x: number; y: number; deg: number };
};

export function buildLayout(arcs: SunburstArc[], maxWeight: number): LayoutItem[] {
	const n = arcs.length;
	if (n === 0) return [];
	const span = (Math.PI * 2 - GAP * n) / n;
	return arcs.map((arc, i) => {
		const a0 = i * (span + GAP) - Math.PI / 2 + GAP / 2;
		const a1 = a0 + span;
		const mid = (a0 + a1) / 2;
		const sorted = [...arc.relatedTags].sort((x, y) => y.weight - x.weight);
		const shown = sorted.slice(0, MAX_DOTS);
		const overflow = sorted.length - shown.length;
		const slots = shown.length + (overflow > 0 ? 1 : 0);
		const start = mid - ((slots - 1) * DOT_STEP) / 2;
		const angleAt = (k: number) => start + k * DOT_STEP;
		const dots = shown.map((rt, k) => {
			const [x, y] = polar(RD, angleAt(k));
			return { rt, x, y, r: 3.5 + (rt.weight / maxWeight) * 7 };
		});
		let badge: { count: number; x: number; y: number } | null = null;
		if (overflow > 0) {
			const [x, y] = polar(RD, angleAt(slots - 1));
			badge = { count: overflow, x, y };
		}
		let deg = ((((mid * 180) / Math.PI + 90) % 360) + 360) % 360;
		if (deg > 90 && deg < 270) deg += 180;
		const [lx, ly] = polar((RI + RO) / 2, mid);
		return { arc, i, a0, a1, mid, span, dots, badge, label: { x: lx, y: ly, deg } };
	});
}

export type ChordData = {
	id: string;
	x1: number; y1: number;
	x2: number; y2: number;
	c1: string; c2: string;
	w: number; a: number; b: number;
};

export function buildChords(
	layout: LayoutItem[],
	indexByLabel: Record<string, number>,
	maxWeight: number
): ChordData[] {
	const key = (from: string, to: string) => `${from}\n${to}`;
	const dotByPair: Record<string, { x: number; y: number }> = {};
	for (const l of layout) {
		for (const d of l.dots) dotByPair[key(l.arc.label, d.rt.label)] = { x: d.x, y: d.y };
	}

	const out: ChordData[] = [];
	for (const l of layout) {
		for (const d of l.dots) {
			const partner = indexByLabel[d.rt.label];
			if (partner === undefined || partner === l.i) continue;
			const pl = layout[partner];
			const back = dotByPair[key(pl.arc.label, l.arc.label)];
			let end: { x: number; y: number };
			if (back) {
				// Mutual: both arcs show each other — draw once, dot-to-dot.
				if (l.i >= partner) continue;
				end = back;
			} else {
				// One-sided: partner hides this tag in its overflow — anchor to the badge.
				if (!pl.badge) continue;
				end = { x: pl.badge.x, y: pl.badge.y };
			}
			out.push({
				id: `${Math.min(l.i, partner)}-${Math.max(l.i, partner)}`,
				x1: d.x, y1: d.y,
				x2: end.x, y2: end.y,
				c1: l.arc.color, c2: d.rt.color,
				w: 0.5 + (d.rt.weight / maxWeight) * 2,
				a: l.i, b: partner
			});
		}
	}
	return out;
}

export function sector(a0: number, a1: number): string {
	const [x0o, y0o] = polar(RO, a0);
	const [x1o, y1o] = polar(RO, a1);
	const [x1i, y1i] = polar(RI, a1);
	const [x0i, y0i] = polar(RI, a0);
	const large = a1 - a0 > Math.PI ? 1 : 0;
	return `M ${x0o} ${y0o} A ${RO} ${RO} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${RI} ${RI} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

// ─── Force-graph geometry ─────────────────────────────────────────────────────
// Node/link construction and the canvas pan/zoom + hit-test math for the force
// view, moved out of the component (Concept 09). The `d3-force` import is
// type-only — the simulation and canvas runtime stay in the components'
// `force-sim.ts` / `force-render.ts`; `ForceNode` carries the x/y/vx/vy/fx/fy
// fields the simulation writes onto it.

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
 * sunburst uses: every tag becomes a node, every weighted edge a link.
 * Links whose endpoints are not known tags are dropped.
 */
export function buildForceGraph(
	tags: Tag[],
	edges: WeightedEdge[],
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
	for (const c of edges) {
		const a = c.a.toLowerCase();
		const b = c.b.toLowerCase();
		if (a !== b && known.has(a) && known.has(b)) {
			links.push({ source: a, target: b, weight: c.weight });
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
