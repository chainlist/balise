import { describe, expect, it } from 'vitest';
import { shapeHit, shapeIsClosed, shapeSegments, shapeVertices, type Shape } from './shape';

function shape(kind: Shape['kind'], overrides: Partial<Shape> = {}): Shape {
	return {
		kind,
		x: 0,
		y: 0,
		w: 100,
		h: 100,
		color: '#abc',
		fill: 'transparent',
		size: 4,
		...overrides
	};
}

function bounds(pts: { x: number; y: number }[]) {
	return {
		left: Math.min(...pts.map((p) => p.x)),
		top: Math.min(...pts.map((p) => p.y)),
		right: Math.max(...pts.map((p) => p.x)),
		bottom: Math.max(...pts.map((p) => p.y))
	};
}

describe('shape', () => {
	it('closed kinds fill, line and arrow stay open', () => {
		expect(shapeIsClosed('square')).toBe(true);
		expect(shapeIsClosed('heart')).toBe(true);
		expect(shapeIsClosed('line')).toBe(false);
		expect(shapeIsClosed('arrow')).toBe(false);
	});

	it('a backwards drag yields the same normalized box', () => {
		const forward = bounds(shapeVertices(shape('square')));
		const backward = bounds(shapeVertices(shape('square', { x: 100, y: 100, w: -100, h: -100 })));
		expect(backward).toEqual(forward);
		expect(forward).toEqual({ left: 0, top: 0, right: 100, bottom: 100 });
	});

	it('curved shapes cover the whole drag box', () => {
		for (const kind of ['circle', 'star', 'heart'] as const) {
			const b = bounds(shapeVertices(shape(kind)));
			expect(b.left).toBeCloseTo(0, 5);
			expect(b.top).toBeCloseTo(0, 5);
			expect(b.right).toBeCloseTo(100, 5);
			expect(b.bottom).toBeCloseTo(100, 5);
		}
	});

	it('line keeps the drag direction', () => {
		const [seg] = shapeSegments(shape('line', { x: 100, y: 50, w: -100, h: -50 }));
		expect(seg).toEqual([
			{ x: 100, y: 50 },
			{ x: 0, y: 0 }
		]);
	});

	it('arrow adds a head at the drag end', () => {
		const [shaft, head] = shapeSegments(shape('arrow', { w: 100, h: 0 }));
		expect(shaft).toEqual([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 }
		]);
		// Both wings meet the tip and sit behind it.
		expect(head[1]).toEqual({ x: 100, y: 0 });
		expect(head[0].x).toBeLessThan(100);
		expect(head[2].x).toBeLessThan(100);
		expect(head[0].y).toBeLessThan(0);
		expect(head[2].y).toBeGreaterThan(0);
	});

	it('shapeHit hits the outline but not a hollow interior', () => {
		const hollow = shape('square');
		expect(shapeHit(hollow, 50, 0, 4)).toBe(true); // top edge midpoint
		expect(shapeHit(hollow, 50, 50, 4)).toBe(false); // centre
		expect(shapeHit(hollow, 200, 200, 4)).toBe(false);
	});

	it('shapeHit hits anywhere inside a filled shape', () => {
		const filled = shape('square', { fill: '#abc' });
		expect(shapeHit(filled, 50, 50, 4)).toBe(true);
		expect(shapeHit(filled, 200, 200, 4)).toBe(false);
	});

	it('shapeHit widens with the eraser radius and outline width', () => {
		const s = shape('line', { w: 100, h: 0, size: 10 });
		// 12px off the shaft: within radius 8 + size 10 / 2.
		expect(shapeHit(s, 50, 12, 8)).toBe(true);
		expect(shapeHit(s, 50, 14, 8)).toBe(false);
	});
});
