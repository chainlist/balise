import { describe, it, expect } from 'vitest';
import {
	jaccardWeight,
	assignGraphColors,
	DEFAULT_TAG_COLOR,
	buildScores,
	buildNeighbors,
	rankTags,
	weightedEdges,
	neighborsOf,
	buildLayout,
	GAP,
	MAX_DOTS,
	buildForceGraph,
	nodeRadiusFor,
	findNodeAt,
	buildAdjacency,
	screenToWorld,
	worldToScreen,
	type TagCooccurrence,
	type WeightedEdge,
	type SunburstArc,
	type ForceNode,
	type ForceLink
} from './graph';
import type { Tag } from './tag';

function makeTag(tag: string, color: string | null = null, count = 1): Tag {
	return { tag, color, display_name: null, pinned: false, count };
}

describe('jaccardWeight', () => {
	it('is 1 when two tags always appear together', () => {
		expect(jaccardWeight(5, 5, 5)).toBe(1);
	});

	it('is the overlap ratio for a partial intersection', () => {
		// 2 shared, 10 with a, 4 with b -> union 12 -> 2/12
		expect(jaccardWeight(10, 4, 2)).toBeCloseTo(2 / 12, 10);
	});

	it('stays small when one tag is on almost everything', () => {
		// b is huge (100), shares 3 with a (3) -> 3 / 100
		expect(jaccardWeight(3, 100, 3)).toBeCloseTo(3 / 100, 10);
	});

	it('returns 0 when the union is empty', () => {
		expect(jaccardWeight(0, 0, 0)).toBe(0);
	});
});

describe('assignGraphColors', () => {
	it('returns a record keyed by lowercase tag name', () => {
		const tags = [makeTag('Work')];
		const colors = assignGraphColors(tags, false);
		expect(colors['work']).toBeDefined();
		expect(colors['Work']).toBeUndefined();
	});

	it('uses the palette color for tags with no custom color', () => {
		const tags = [makeTag('a'), makeTag('b')];
		const colors = assignGraphColors(tags, false);
		expect(colors['a']).toMatch(/^#/);
		expect(colors['b']).toMatch(/^#/);
	});

	it('uses a different palette for dark mode', () => {
		const tags = [makeTag('x')];
		const light = assignGraphColors(tags, false);
		const dark = assignGraphColors(tags, true);
		expect(light['x']).not.toBe(dark['x']);
	});

	it('uses the tag custom color when set and not the default', () => {
		const tags = [makeTag('special', '#FF0000')];
		const colors = assignGraphColors(tags, false);
		expect(colors['special']).toBe('#FF0000');
	});

	it('ignores custom color equal to DEFAULT_TAG_COLOR and uses palette instead', () => {
		// PALETTE_LIGHT[0] === DEFAULT_TAG_COLOR, so we can't assert "not equal to DEFAULT_TAG_COLOR".
		// Instead verify the branch behaves identically to having no custom color.
		const withDefault = assignGraphColors([makeTag('plain', DEFAULT_TAG_COLOR)], false);
		const withNull = assignGraphColors([makeTag('plain', null)], false);
		expect(withDefault['plain']).toBe(withNull['plain']);
	});

	it('cycles palette colors when there are more tags than palette entries', () => {
		const tags = Array.from({ length: 20 }, (_, i) => makeTag(`t${i}`));
		const colors = assignGraphColors(tags, false);
		expect(Object.keys(colors)).toHaveLength(20);
		for (const key of Object.keys(colors)) {
			expect(colors[key]).toMatch(/^#/);
		}
	});

	it('second tag in rank gets a different palette color than the first', () => {
		const tags = [makeTag('first'), makeTag('second')];
		const colors = assignGraphColors(tags, false);
		expect(colors['first']).not.toBe(colors['second']);
	});
});

describe('scoring and ranking', () => {
	const tags = [makeTag('a', null, 10), makeTag('b', null, 8), makeTag('c', null, 4)];
	const cooccurrences: TagCooccurrence[] = [
		{ tagA: 'a', tagB: 'b', count: 5, countA: 10, countB: 8 },
		{ tagA: 'a', tagB: 'c', count: 2, countA: 10, countB: 4 }
	];

	it('buildScores sums every pair count onto both endpoints, keyed by lowercase', () => {
		expect(buildScores(tags, cooccurrences)).toEqual({ a: 7, b: 5, c: 2 });
	});

	it('buildScores gives an unconnected tag a zero score (so it still ranks)', () => {
		expect(buildScores([makeTag('lonely')], [])).toEqual({ lonely: 0 });
	});

	it('buildScores ignores cooccurrence rows for tags not in the set', () => {
		const scores = buildScores(
			[makeTag('a')],
			[{ tagA: 'a', tagB: 'ghost', count: 3, countA: 1, countB: 1 }]
		);
		expect(scores).toEqual({ a: 3 });
	});

	it('rankTags orders by descending score', () => {
		const ranked = rankTags(tags, buildScores(tags, cooccurrences));
		expect(ranked.map((t) => t.tag)).toEqual(['a', 'b', 'c']);
	});

	it('rankTags breaks score ties alphabetically (case-insensitive)', () => {
		const tied = [makeTag('Zebra'), makeTag('apple'), makeTag('Mango')];
		const ranked = rankTags(tied, buildScores(tied, []));
		expect(ranked.map((t) => t.tag)).toEqual(['apple', 'Mango', 'Zebra']);
	});
});

describe('neighbour adjacency', () => {
	const tags = [makeTag('a', null, 10), makeTag('b', null, 8), makeTag('c', null, 4)];
	const cooccurrences: TagCooccurrence[] = [
		{ tagA: 'a', tagB: 'b', count: 5, countA: 10, countB: 8 },
		{ tagA: 'a', tagB: 'c', count: 2, countA: 10, countB: 4 }
	];

	it('is symmetric: the a-b edge has the same weight from either side', () => {
		const neighbors = buildNeighbors(tags, cooccurrences);
		const aToB = neighbors['a'].find((n) => n.tag.tag === 'b');
		const bToA = neighbors['b'].find((n) => n.tag.tag === 'a');
		expect(aToB?.weight).toBe(bToA?.weight);
		expect(aToB?.weight).toBeCloseTo(jaccardWeight(10, 8, 5), 10);
	});

	it('sorts each neighbour list by descending weight', () => {
		const neighbors = buildNeighbors(tags, cooccurrences);
		// a-b weight (5/13) > a-c weight (2/12), so b comes before c.
		expect(neighbors['a'].map((n) => n.tag.tag)).toEqual(['b', 'c']);
	});

	it('drops cooccurrence rows whose endpoints are not known tags', () => {
		const neighbors = buildNeighbors(
			[makeTag('a')],
			[{ tagA: 'a', tagB: 'ghost', count: 3, countA: 1, countB: 1 }]
		);
		expect(neighbors['a']).toBeUndefined();
	});

	it('neighborsOf looks up by name case-insensitively', () => {
		const neighbors = buildNeighbors(tags, cooccurrences);
		expect(neighborsOf(neighbors, 'A').map((n) => n.tag.tag)).toEqual(['b', 'c']);
	});

	it('neighborsOf with no minStrength returns every neighbour', () => {
		const neighbors = buildNeighbors(tags, cooccurrences);
		expect(neighborsOf(neighbors, 'a')).toHaveLength(2);
	});

	it('neighborsOf filters out neighbours below minStrength', () => {
		const neighbors = buildNeighbors(tags, cooccurrences);
		// a-b ~= 0.385, a-c ~= 0.167; a 0.3 floor keeps only b.
		const strong = neighborsOf(neighbors, 'a', 0.3);
		expect(strong.map((n) => n.tag.tag)).toEqual(['b']);
	});

	it('neighborsOf returns an empty list for an unknown tag', () => {
		const neighbors = buildNeighbors(tags, cooccurrences);
		expect(neighborsOf(neighbors, 'nope')).toEqual([]);
	});
});

describe('weightedEdges', () => {
	it('maps each cooccurrence to a Jaccard-weighted edge, keeping original casing', () => {
		const cooccurrences: TagCooccurrence[] = [
			{ tagA: 'Work', tagB: 'Home', count: 2, countA: 10, countB: 4 }
		];
		expect(weightedEdges(cooccurrences)).toEqual([
			{ a: 'Work', b: 'Home', weight: jaccardWeight(10, 4, 2) }
		]);
	});

	it('returns an empty array when there are no cooccurrences', () => {
		expect(weightedEdges([])).toEqual([]);
	});
});

// ─── Sunburst geometry ────────────────────────────────────────────────────────

function makeArc(
	label: string,
	relatedTags: { label: string; weight: number }[] = []
): SunburstArc {
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
		const expected = 0 * ((Math.PI * 2 - GAP * 2) / 2 + GAP) - Math.PI / 2 + GAP / 2;
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
		const arcs = [
			makeArc('a', [
				{ label: 'light', weight: 1 },
				{ label: 'heavy', weight: 10 }
			])
		];
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

// ─── Force-graph geometry ─────────────────────────────────────────────────────

const forceOpts = {
	colorFor: () => '#abcdef',
	labelFor: (t: Tag) => t.tag.toUpperCase()
};

describe('nodeRadiusFor', () => {
	it('returns the minimum radius when maxCount is zero', () => {
		expect(nodeRadiusFor(0, 0)).toBe(5);
	});

	it('grows with count', () => {
		expect(nodeRadiusFor(10, 10)).toBeGreaterThan(nodeRadiusFor(1, 10));
	});

	it('caps at the maximum radius for the largest count', () => {
		expect(nodeRadiusFor(10, 10)).toBe(22);
	});
});

describe('buildForceGraph', () => {
	it('creates one node per tag', () => {
		const tags = [makeTag('a'), makeTag('b'), makeTag('c')];
		const { nodes } = buildForceGraph(tags, [], forceOpts);
		expect(nodes).toHaveLength(3);
	});

	it('lowercases ids but keeps the original tag and applies label/color', () => {
		const { nodes } = buildForceGraph([makeTag('JavaScript', null, 4)], [], forceOpts);
		expect(nodes[0].id).toBe('javascript');
		expect(nodes[0].tag).toBe('JavaScript');
		expect(nodes[0].label).toBe('JAVASCRIPT');
		expect(nodes[0].color).toBe('#abcdef');
		expect(nodes[0].count).toBe(4);
	});

	it('keeps links whose endpoints are known tags', () => {
		const tags = [makeTag('a'), makeTag('b')];
		const edges: WeightedEdge[] = [{ a: 'A', b: 'b', weight: 0.3 }];
		const { links } = buildForceGraph(tags, edges, forceOpts);
		expect(links).toHaveLength(1);
		expect(links[0]).toMatchObject({ source: 'a', target: 'b', weight: 0.3 });
	});

	it('drops links whose endpoints are not known tags', () => {
		const tags = [makeTag('a')];
		const edges: WeightedEdge[] = [{ a: 'a', b: 'ghost', weight: 0.2 }];
		const { links } = buildForceGraph(tags, edges, forceOpts);
		expect(links).toHaveLength(0);
	});

	it('drops self-links', () => {
		const tags = [makeTag('a')];
		const edges: WeightedEdge[] = [{ a: 'a', b: 'A', weight: 0.5 }];
		const { links } = buildForceGraph(tags, edges, forceOpts);
		expect(links).toHaveLength(0);
	});

	it('keeps all nodes by default even when isolated', () => {
		const tags = [makeTag('a'), makeTag('b'), makeTag('lonely')];
		const edges: WeightedEdge[] = [{ a: 'a', b: 'b', weight: 0.1 }];
		const { nodes } = buildForceGraph(tags, edges, forceOpts);
		expect(nodes.map((n) => n.id)).toContain('lonely');
	});

	it('drops isolated nodes when hideIsolated is set', () => {
		const tags = [makeTag('a'), makeTag('b'), makeTag('lonely')];
		const edges: WeightedEdge[] = [{ a: 'a', b: 'b', weight: 0.1 }];
		const { nodes } = buildForceGraph(tags, edges, { ...forceOpts, hideIsolated: true });
		expect(nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
	});
});

describe('buildAdjacency', () => {
	it('records both directions of each link', () => {
		const links: ForceLink[] = [{ source: 'a', target: 'b', weight: 1 }];
		const adj = buildAdjacency(links);
		expect(adj.get('a')?.has('b')).toBe(true);
		expect(adj.get('b')?.has('a')).toBe(true);
	});

	it('handles endpoints already resolved to node refs', () => {
		const a = { id: 'a' } as ForceNode;
		const b = { id: 'b' } as ForceNode;
		const adj = buildAdjacency([{ source: a, target: b, weight: 1 }]);
		expect(adj.get('a')?.has('b')).toBe(true);
	});
});

describe('coordinate transforms', () => {
	it('worldToScreen and screenToWorld are inverses', () => {
		const t = { k: 2, x: 30, y: -10 };
		const s = worldToScreen(5, 7, t);
		const w = screenToWorld(s.x, s.y, t);
		expect(w.x).toBeCloseTo(5, 10);
		expect(w.y).toBeCloseTo(7, 10);
	});
});

describe('findNodeAt', () => {
	const nodes: ForceNode[] = [
		{ id: 'a', tag: 'a', label: 'a', color: '#000', count: 1, r: 10, x: 0, y: 0 },
		{ id: 'b', tag: 'b', label: 'b', color: '#000', count: 1, r: 10, x: 100, y: 0 }
	];

	it('returns the node whose circle contains the point', () => {
		expect(findNodeAt(nodes, 3, 3)?.id).toBe('a');
	});

	it('returns null when the point is outside every node', () => {
		expect(findNodeAt(nodes, 50, 50)).toBeNull();
	});

	it('returns the topmost node when circles overlap', () => {
		const overlapping: ForceNode[] = [
			{ id: 'under', tag: 'under', label: '', color: '#000', count: 1, r: 20, x: 0, y: 0 },
			{ id: 'over', tag: 'over', label: '', color: '#000', count: 1, r: 20, x: 0, y: 0 }
		];
		expect(findNodeAt(overlapping, 0, 0)?.id).toBe('over');
	});

	it('skips nodes without a position', () => {
		const unplaced: ForceNode[] = [
			{ id: 'a', tag: 'a', label: '', color: '#000', count: 1, r: 10 }
		];
		expect(findNodeAt(unplaced, 0, 0)).toBeNull();
	});
});
