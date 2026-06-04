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

export function polar(r: number, a: number): [number, number] {
	return [C + Math.cos(a) * r, C + Math.sin(a) * r];
}

export function ra(hex: string, op: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${op})`;
}

export function sector(a0: number, a1: number): string {
	const [x0o, y0o] = polar(RO, a0);
	const [x1o, y1o] = polar(RO, a1);
	const [x1i, y1i] = polar(RI, a1);
	const [x0i, y0i] = polar(RI, a0);
	const large = a1 - a0 > Math.PI ? 1 : 0;
	return `M ${x0o} ${y0o} A ${RO} ${RO} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${RI} ${RI} 0 ${large} 0 ${x0i} ${y0i} Z`;
}
