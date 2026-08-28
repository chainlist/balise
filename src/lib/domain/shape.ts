// Predefined shapes overlaid on a note. Pure geometry only: a shape is defined
// by the drag that created it (start point + vector, so lines and arrows keep
// their direction) and everything else — outline polylines, bounds, erasing —
// derives from that here. Turning polylines into SVG paths is presentation
// (see components/notes/shape-path.ts).

export const SHAPE_KINDS = [
	'square',
	'circle',
	'triangle',
	'diamond',
	'star',
	'heart',
	'arrow',
	'line'
] as const;

export type ShapeKind = (typeof SHAPE_KINDS)[number];

/** Sentinel color for a hollow fill or an invisible outline. */
export const TRANSPARENT = 'transparent';

/** One placed shape, in the owning drawing's coordinates. `x`/`y` is the drag
 *  start and `w`/`h` the drag vector — components may be negative, which keeps
 *  the direction of lines and arrows. `color` is the outline, `fill` the
 *  interior (either may be `transparent`), `size` the outline width. */
export interface Shape {
	kind: ShapeKind;
	x: number;
	y: number;
	w: number;
	h: number;
	color: string;
	fill: string;
	size: number;
}

interface Pt {
	x: number;
	y: number;
}

/** Whether the shape's polyline is a closed ring that can be filled. */
export function shapeIsClosed(kind: ShapeKind): boolean {
	return kind !== 'line' && kind !== 'arrow';
}

const CURVE_SAMPLES = 48;
const STAR_INNER = 0.42;

/** Drag box normalized so negative drag components still yield a proper box. */
function box(shape: Shape) {
	return {
		left: Math.min(shape.x, shape.x + shape.w),
		top: Math.min(shape.y, shape.y + shape.h),
		w: Math.abs(shape.w),
		h: Math.abs(shape.h)
	};
}

/** Scale unit-space points to exactly cover the shape's drag box. */
function fitToBox(pts: Pt[], left: number, top: number, w: number, h: number): Pt[] {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const p of pts) {
		if (p.x < minX) minX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.x > maxX) maxX = p.x;
		if (p.y > maxY) maxY = p.y;
	}
	const sx = maxX > minX ? w / (maxX - minX) : 0;
	const sy = maxY > minY ? h / (maxY - minY) : 0;
	return pts.map((p) => ({ x: left + (p.x - minX) * sx, y: top + (p.y - minY) * sy }));
}

function ring(shape: Shape): Pt[] {
	const { left, top, w, h } = box(shape);
	const right = left + w;
	const bottom = top + h;
	const cx = left + w / 2;
	const cy = top + h / 2;
	switch (shape.kind) {
		case 'square':
			return [
				{ x: left, y: top },
				{ x: right, y: top },
				{ x: right, y: bottom },
				{ x: left, y: bottom }
			];
		case 'triangle':
			return [
				{ x: cx, y: top },
				{ x: right, y: bottom },
				{ x: left, y: bottom }
			];
		case 'diamond':
			return [
				{ x: cx, y: top },
				{ x: right, y: cy },
				{ x: cx, y: bottom },
				{ x: left, y: cy }
			];
		case 'circle': {
			const pts: Pt[] = [];
			for (let i = 0; i < CURVE_SAMPLES; i++) {
				const t = (i / CURVE_SAMPLES) * 2 * Math.PI;
				pts.push({ x: cx + (Math.cos(t) * w) / 2, y: cy + (Math.sin(t) * h) / 2 });
			}
			return pts;
		}
		case 'star': {
			const pts: Pt[] = [];
			for (let i = 0; i < 10; i++) {
				const t = -Math.PI / 2 + (i * Math.PI) / 5;
				const r = i % 2 === 0 ? 1 : STAR_INNER;
				pts.push({ x: cx + (Math.cos(t) * r * w) / 2, y: cy + (Math.sin(t) * r * h) / 2 });
			}
			return fitToBox(pts, left, top, w, h);
		}
		case 'heart': {
			// Classic parametric heart, sampled then scaled to cover the box
			// (y is negated because the curve is defined y-up).
			const pts: Pt[] = [];
			for (let i = 0; i < CURVE_SAMPLES; i++) {
				const t = (i / CURVE_SAMPLES) * 2 * Math.PI;
				pts.push({
					x: 16 * Math.sin(t) ** 3,
					y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
				});
			}
			return fitToBox(pts, left, top, w, h);
		}
		default:
			return [];
	}
}

/** The polylines making up a shape: one closed ring for fillable kinds, the
 *  bare segment for a line, and shaft + head for an arrow. */
export function shapeSegments(shape: Shape): Pt[][] {
	const start = { x: shape.x, y: shape.y };
	const end = { x: shape.x + shape.w, y: shape.y + shape.h };
	if (shape.kind === 'line') return [[start, end]];
	if (shape.kind === 'arrow') {
		const len = Math.hypot(shape.w, shape.h) || 1;
		const head = Math.min(len * 0.5, shape.size * 2.5 + 6);
		// Head wings: step back along the shaft, rotated ±30°.
		const bx = (-shape.w / len) * head;
		const by = (-shape.h / len) * head;
		const sin = Math.sin(Math.PI / 6);
		const cos = Math.cos(Math.PI / 6);
		const wing1 = { x: end.x + bx * cos - by * sin, y: end.y + bx * sin + by * cos };
		const wing2 = { x: end.x + bx * cos + by * sin, y: end.y - bx * sin + by * cos };
		return [
			[start, end],
			[wing1, end, wing2]
		];
	}
	return [ring(shape)];
}

/** Every vertex of the shape's polylines — enough for bounding boxes. */
export function shapeVertices(shape: Shape): Pt[] {
	return shapeSegments(shape).flat();
}

function segmentDistanceSq(a: Pt, b: Pt, x: number, y: number): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lenSq = dx * dx + dy * dy;
	const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lenSq));
	const px = a.x + t * dx;
	const py = a.y + t * dy;
	return (x - px) ** 2 + (y - py) ** 2;
}

function pointInPolygon(pts: Pt[], x: number, y: number): boolean {
	let inside = false;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const a = pts[i];
		const b = pts[j];
		if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
			inside = !inside;
		}
	}
	return inside;
}

/** Whether an eraser tap at (`x`,`y`) hits the shape: near its outline, or
 *  anywhere inside it when the shape is filled. */
export function shapeHit(shape: Shape, x: number, y: number, radius: number): boolean {
	const r = radius + shape.size / 2;
	const rSq = r * r;
	const closed = shapeIsClosed(shape.kind);
	for (const pts of shapeSegments(shape)) {
		const edges = closed ? pts.length : pts.length - 1;
		for (let i = 0; i < edges; i++) {
			if (segmentDistanceSq(pts[i], pts[(i + 1) % pts.length], x, y) <= rSq) return true;
		}
	}
	if (closed && shape.fill !== TRANSPARENT) return pointInPolygon(ring(shape), x, y);
	return false;
}
