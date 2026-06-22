import { describe, it, expect } from 'vitest';
import { jaccardWeight } from './graph-weight';

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
