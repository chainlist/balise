import { describe, it, expect } from 'vitest';
import {
	buildForceGraph,
	nodeRadiusFor,
	findNodeAt,
	buildAdjacency,
	screenToWorld,
	worldToScreen,
	type ForceNode,
	type ForceLink,
	type TagCooccurrence
} from './force-graph';
import type { Tag } from '$lib/models/tag';

function makeTag(tag: string, count = 1): Tag {
	return { tag, color: null, display_name: null, pinned: false, count };
}

const opts = {
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
		const { nodes } = buildForceGraph(tags, [], opts);
		expect(nodes).toHaveLength(3);
	});

	it('lowercases ids but keeps the original tag and applies label/color', () => {
		const { nodes } = buildForceGraph([makeTag('JavaScript', 4)], [], opts);
		expect(nodes[0].id).toBe('javascript');
		expect(nodes[0].tag).toBe('JavaScript');
		expect(nodes[0].label).toBe('JAVASCRIPT');
		expect(nodes[0].color).toBe('#abcdef');
		expect(nodes[0].count).toBe(4);
	});

	it('keeps links whose endpoints are known tags', () => {
		const tags = [makeTag('a'), makeTag('b')];
		const cooc: TagCooccurrence[] = [{ a: 'A', b: 'b', weight: 0.3 }];
		const { links } = buildForceGraph(tags, cooc, opts);
		expect(links).toHaveLength(1);
		expect(links[0]).toMatchObject({ source: 'a', target: 'b', weight: 0.3 });
	});

	it('drops links whose endpoints are not known tags', () => {
		const tags = [makeTag('a')];
		const cooc: TagCooccurrence[] = [{ a: 'a', b: 'ghost', weight: 0.2 }];
		const { links } = buildForceGraph(tags, cooc, opts);
		expect(links).toHaveLength(0);
	});

	it('drops self-links', () => {
		const tags = [makeTag('a')];
		const cooc: TagCooccurrence[] = [{ a: 'a', b: 'A', weight: 0.5 }];
		const { links } = buildForceGraph(tags, cooc, opts);
		expect(links).toHaveLength(0);
	});

	it('keeps all nodes by default even when isolated', () => {
		const tags = [makeTag('a'), makeTag('b'), makeTag('lonely')];
		const cooc: TagCooccurrence[] = [{ a: 'a', b: 'b', weight: 0.1 }];
		const { nodes } = buildForceGraph(tags, cooc, opts);
		expect(nodes.map((n) => n.id)).toContain('lonely');
	});

	it('drops isolated nodes when hideIsolated is set', () => {
		const tags = [makeTag('a'), makeTag('b'), makeTag('lonely')];
		const cooc: TagCooccurrence[] = [{ a: 'a', b: 'b', weight: 0.1 }];
		const { nodes } = buildForceGraph(tags, cooc, { ...opts, hideIsolated: true });
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
