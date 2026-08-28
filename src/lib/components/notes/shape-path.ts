import { shapeIsClosed, shapeSegments, type Shape } from '$lib/domain/shape';

// Presentation helper: turn a shape's outline polylines into an SVG path.
// Curved kinds are sampled densely enough in the domain to render smooth.

export function shapePath(shape: Shape): string {
	const closed = shapeIsClosed(shape.kind);
	return shapeSegments(shape)
		.map((pts) => 'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ') + (closed ? ' Z' : ''))
		.join(' ');
}

/** SVG fill attribute: open shapes (line, arrow) never fill. */
export function shapeFillAttr(shape: Shape): string {
	return shapeIsClosed(shape.kind) ? shape.fill : 'none';
}
