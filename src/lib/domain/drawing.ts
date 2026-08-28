import { newId } from './shared/id';

// Freehand drawings overlaid on a note. Pure rules only: coordinate space,
// grouping of strokes into drawings, bounds, and erasing. Capturing pointer
// input and turning strokes into brush outlines is presentation (see
// components/notes).

/** One captured pointer sample. `x` is relative to the horizontal centre of the
 *  note pane (so drawings stay glued to the centred editor column when the pane
 *  resizes), `y` runs from the top of the note content, `p` is pointer pressure. */
export interface StrokePoint {
	x: number;
	y: number;
	p: number;
}

/** One brush stroke: its base width and the captured points. */
export interface Stroke {
	size: number;
	points: StrokePoint[];
}

/** One or more brush strokes moved and deleted as a unit. `x`/`y` is the
 *  translation applied when the drawing is moved; stroke points keep the
 *  coordinates they were captured with. */
export interface Drawing {
	id: string;
	color: string;
	x: number;
	y: number;
	strokes: Stroke[];
}

export interface Bounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

/** How close (px) a new stroke must come to an existing drawing to join it, so
 *  an arrow head drawn next to its shaft moves with it as one drawing. */
const GROUP_MARGIN = 40;

export function createDrawing(stroke: Stroke, color: string): Drawing {
	return { id: newId(), color, x: 0, y: 0, strokes: [stroke] };
}

/** Append a stroke to an existing drawing, re-expressing its points in the
 *  drawing's own (untranslated) coordinates so a moved drawing stays coherent. */
export function withStroke(drawing: Drawing, stroke: Stroke): Drawing {
	const local = {
		...stroke,
		points: stroke.points.map((p) => ({ ...p, x: p.x - drawing.x, y: p.y - drawing.y }))
	};
	return { ...drawing, strokes: [...drawing.strokes, local] };
}

function pointsBounds(points: StrokePoint[]): Bounds {
	let left = Infinity;
	let top = Infinity;
	let right = -Infinity;
	let bottom = -Infinity;
	for (const p of points) {
		if (p.x < left) left = p.x;
		if (p.y < top) top = p.y;
		if (p.x > right) right = p.x;
		if (p.y > bottom) bottom = p.y;
	}
	return { left, top, right, bottom };
}

/** Bounding box of a drawing in pane coordinates (translation applied). */
export function drawingBounds(drawing: Drawing): Bounds {
	const b = pointsBounds(drawing.strokes.flatMap((s) => s.points));
	return {
		left: b.left + drawing.x,
		top: b.top + drawing.y,
		right: b.right + drawing.x,
		bottom: b.bottom + drawing.y
	};
}

/** Whether freshly drawn stroke points are close enough to join the drawing. */
export function strokeJoinsDrawing(
	drawing: Drawing,
	points: StrokePoint[],
	margin = GROUP_MARGIN
): boolean {
	const a = drawingBounds(drawing);
	const b = pointsBounds(points);
	return (
		b.left - margin <= a.right &&
		b.right + margin >= a.left &&
		b.top - margin <= a.bottom &&
		b.bottom + margin >= a.top
	);
}

function strokeHit(stroke: Stroke, x: number, y: number, radius: number): boolean {
	const r = radius + stroke.size / 2;
	const r2 = r * r;
	return stroke.points.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 <= r2);
}

/** Remove every stroke within `radius` of the point (pane coordinates) and drop
 *  drawings left empty. Returns the input array unchanged when nothing is hit,
 *  so callers can detect a no-op by reference. */
export function eraseAt(
	drawings: Drawing[],
	point: { x: number; y: number },
	radius: number
): Drawing[] {
	let changed = false;
	const result = drawings
		.map((d) => {
			const kept = d.strokes.filter((s) => !strokeHit(s, point.x - d.x, point.y - d.y, radius));
			if (kept.length === d.strokes.length) return d;
			changed = true;
			return { ...d, strokes: kept };
		})
		.filter((d) => d.strokes.length > 0);
	return changed ? result : drawings;
}
