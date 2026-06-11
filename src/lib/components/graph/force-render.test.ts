import { describe, it, expect } from 'vitest';
import { nodeAlpha, linkAlpha } from './force-render';

const adjacency = new Map([
	['a', new Set(['b'])],
	['b', new Set(['a'])]
]);

describe('nodeAlpha', () => {
	it('returns 1 for every node when nothing is focused', () => {
		expect(nodeAlpha('a', null, adjacency)).toBe(1);
		expect(nodeAlpha('c', null, adjacency)).toBe(1);
	});

	it('returns 1 for the focused node and its neighbors', () => {
		expect(nodeAlpha('a', 'a', adjacency)).toBe(1);
		expect(nodeAlpha('b', 'a', adjacency)).toBe(1);
	});

	it('dims nodes unrelated to the focus', () => {
		expect(nodeAlpha('c', 'a', adjacency)).toBe(0.18);
	});
});

describe('linkAlpha', () => {
	it('uses the resting alpha when nothing is focused', () => {
		expect(linkAlpha('a', 'b', null)).toBe(0.5);
	});

	it('emphasises links touching the focus', () => {
		expect(linkAlpha('a', 'b', 'a')).toBe(0.8);
		expect(linkAlpha('a', 'b', 'b')).toBe(0.8);
	});

	it('dims links not touching the focus', () => {
		expect(linkAlpha('a', 'b', 'c')).toBe(0.08);
	});
});
