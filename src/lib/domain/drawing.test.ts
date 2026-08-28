import { describe, expect, it } from 'vitest';
import {
	createDrawing,
	withStroke,
	drawingBounds,
	strokeJoinsDrawing,
	eraseAt,
	type Stroke
} from './drawing';

function stroke(coords: [number, number][], size = 6): Stroke {
	return { size, points: coords.map(([x, y]) => ({ x, y, p: 0.5 })) };
}

describe('drawing', () => {
	it('createDrawing starts untranslated with the single stroke', () => {
		const d = createDrawing(stroke([[10, 20]]), '#abc');
		expect(d.x).toBe(0);
		expect(d.y).toBe(0);
		expect(d.color).toBe('#abc');
		expect(d.strokes).toHaveLength(1);
	});

	it('drawingBounds applies the translation offset', () => {
		const d = {
			...createDrawing(
				stroke([
					[0, 0],
					[10, 30]
				]),
				'#abc'
			),
			x: 5,
			y: -5
		};
		expect(drawingBounds(d)).toEqual({ left: 5, top: -5, right: 15, bottom: 25 });
	});

	it('withStroke stores the new stroke in the drawing-local frame', () => {
		const d = { ...createDrawing(stroke([[0, 0]]), '#abc'), x: 100, y: 50 };
		const joined = withStroke(d, stroke([[110, 60]]));
		expect(joined.strokes[1].points).toEqual([{ x: 10, y: 10, p: 0.5 }]);
		// Rendered position (local + offset) matches where it was drawn.
		expect(drawingBounds(joined).right).toBe(110);
		expect(drawingBounds(joined).bottom).toBe(60);
	});

	it('strokeJoinsDrawing groups near strokes and rejects far ones', () => {
		const d = createDrawing(
			stroke([
				[0, 0],
				[100, 0]
			]),
			'#abc'
		);
		expect(strokeJoinsDrawing(d, stroke([[110, 10]]).points)).toBe(true);
		expect(strokeJoinsDrawing(d, stroke([[300, 300]]).points)).toBe(false);
	});

	it('strokeJoinsDrawing follows a moved drawing', () => {
		const d = { ...createDrawing(stroke([[0, 0]]), '#abc'), x: 500, y: 0 };
		expect(strokeJoinsDrawing(d, stroke([[10, 0]]).points)).toBe(false);
		expect(strokeJoinsDrawing(d, stroke([[510, 0]]).points)).toBe(true);
	});

	it('eraseAt removes hit strokes, keeps others, and drops empty drawings', () => {
		const twoStrokes = withStroke(createDrawing(stroke([[0, 0]]), '#abc'), stroke([[200, 0]]));
		const far = createDrawing(stroke([[500, 500]]), '#def');
		const result = eraseAt([twoStrokes, far], { x: 2, y: 2 }, 10);
		expect(result).toHaveLength(2);
		expect(result[0].strokes).toHaveLength(1);
		expect(result[0].strokes[0].points[0].x).toBe(200);

		// Erasing the remaining stroke drops the whole drawing.
		const emptied = eraseAt(result, { x: 200, y: 0 }, 10);
		expect(emptied.map((d) => d.id)).toEqual([far.id]);
	});

	it('eraseAt accounts for the drawing offset and stroke width', () => {
		const d = { ...createDrawing(stroke([[0, 0]], 10), '#abc'), x: 100, y: 0 };
		// 12px away from the moved stroke centre: within radius 8 + size 10 / 2.
		expect(eraseAt([d], { x: 112, y: 0 }, 8)).toHaveLength(0);
		expect(eraseAt([d], { x: 0, y: 0 }, 8)).toEqual([d]);
	});

	it('eraseAt returns the same array reference on a miss', () => {
		const drawings = [createDrawing(stroke([[0, 0]]), '#abc')];
		expect(eraseAt(drawings, { x: 999, y: 999 }, 10)).toBe(drawings);
	});
});
