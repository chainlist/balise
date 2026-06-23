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
	type TagCooccurrence
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
