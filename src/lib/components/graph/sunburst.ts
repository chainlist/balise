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

// Pure function — no reactivity. Extracted from the $derived.by block in Sunburst.svelte
// so that the complexity is isolated from the component and independently testable.
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
