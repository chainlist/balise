import { describe, it, expect } from 'vitest';
import { buildLayout, GAP, MAX_DOTS, type SunburstArc } from './sunburst';

function makeArc(label: string, relatedTags: { label: string; weight: number }[] = []): SunburstArc {
	return {
		label,
		noteCount: 1,
		color: '#aaaaaa',
		relatedTags: relatedTags.map((r) => ({ ...r, color: '#bbbbbb' }))
	};
}

describe('buildLayout', () => {
	it('returns an empty array when given no arcs', () => {
		expect(buildLayout([], 1)).toHaveLength(0);
	});

	it('returns one item per arc', () => {
		const arcs = [makeArc('a'), makeArc('b'), makeArc('c')];
		expect(buildLayout(arcs, 1)).toHaveLength(3);
	});

	it('assigns sequential indices', () => {
		const arcs = [makeArc('x'), makeArc('y')];
		const layout = buildLayout(arcs, 1);
		expect(layout[0].i).toBe(0);
		expect(layout[1].i).toBe(1);
	});

	it('preserves the arc reference in each item', () => {
		const arcs = [makeArc('foo')];
		const layout = buildLayout(arcs, 1);
		expect(layout[0].arc).toBe(arcs[0]);
	});

	it('a0 for the first arc starts just after the top (-π/2)', () => {
		const arcs = [makeArc('a'), makeArc('b')];
		const layout = buildLayout(arcs, 1);
		const expected = 0 * (((Math.PI * 2 - GAP * 2) / 2) + GAP) - Math.PI / 2 + GAP / 2;
		expect(layout[0].a0).toBeCloseTo(expected, 10);
	});

	it('a1 equals a0 + span for each arc', () => {
		const arcs = [makeArc('a'), makeArc('b'), makeArc('c')];
		const layout = buildLayout(arcs, 1);
		for (const l of layout) {
			expect(l.a1).toBeCloseTo(l.a0 + l.span, 10);
		}
	});

	it('mid is the midpoint of a0 and a1', () => {
		const arcs = [makeArc('a'), makeArc('b')];
		const layout = buildLayout(arcs, 1);
		for (const l of layout) {
			expect(l.mid).toBeCloseTo((l.a0 + l.a1) / 2, 10);
		}
	});

	it('generates dots for each related tag up to MAX_DOTS', () => {
		const related = Array.from({ length: MAX_DOTS + 2 }, (_, i) => ({
			label: `t${i}`,
			weight: 1
		}));
		const arcs = [makeArc('main', related)];
		const layout = buildLayout(arcs, 1);
		expect(layout[0].dots).toHaveLength(MAX_DOTS);
	});

	it('creates a badge when related tags exceed MAX_DOTS', () => {
		const related = Array.from({ length: MAX_DOTS + 3 }, (_, i) => ({
			label: `t${i}`,
			weight: 1
		}));
		const arcs = [makeArc('main', related)];
		const layout = buildLayout(arcs, 1);
		expect(layout[0].badge).not.toBeNull();
		expect(layout[0].badge?.count).toBe(3);
	});

	it('badge is null when related tags do not exceed MAX_DOTS', () => {
		const arcs = [makeArc('a', [{ label: 'b', weight: 2 }])];
		const layout = buildLayout(arcs, 1);
		expect(layout[0].badge).toBeNull();
	});

	it('dot radius grows with weight relative to maxWeight', () => {
		const arcs = [makeArc('a', [{ label: 'light', weight: 1 }, { label: 'heavy', weight: 10 }])];
		const layout = buildLayout(arcs, 10);
		const [heavy, light] = layout[0].dots; // sorted descending by weight
		expect(heavy.r).toBeGreaterThan(light.r);
	});

	it('all arcs together span 2π minus the gaps', () => {
		const arcs = [makeArc('a'), makeArc('b'), makeArc('c'), makeArc('d')];
		const layout = buildLayout(arcs, 1);
		const totalSpan = layout.reduce((sum, l) => sum + l.span, 0);
		const expectedSpan = Math.PI * 2 - GAP * arcs.length;
		expect(totalSpan).toBeCloseTo(expectedSpan, 10);
	});
});
