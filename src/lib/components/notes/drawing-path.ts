import { getStroke } from 'perfect-freehand';
import type { StrokePoint } from '$lib/domain/drawing';

// Presentation helper: turn captured stroke points into a closed SVG path via
// perfect-freehand's variable-width outline, for a natural brush feel.

const BRUSH_OPTIONS = {
	thinning: 0.6,
	smoothing: 0.5,
	streamline: 0.4
};

export function strokePath(points: StrokePoint[], size: number): string {
	if (points.length === 0) return '';
	// Mice report a constant pressure, so let perfect-freehand simulate it from
	// velocity; a real pen's varying pressure is used as-is.
	const simulatePressure = points.every((p) => p.p === points[0].p);
	const outline = getStroke(
		points.map((p) => [p.x, p.y, p.p]),
		{ ...BRUSH_OPTIONS, size, simulatePressure }
	);
	if (outline.length === 0) return '';
	// Midpoint quadratic curves through the outline, closed back to the start.
	const d = outline.reduce(
		(acc, [x0, y0], i, arr) => {
			const [x1, y1] = arr[(i + 1) % arr.length];
			acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
			return acc;
		},
		['M', ...outline[0], 'Q']
	);
	d.push('Z');
	return d.join(' ');
}
