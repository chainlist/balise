import { describe, it, expect } from 'vitest';
import { dayRange, createdAtForDate } from './journal';
import { toSqliteUtc } from './shared/time';

// The dates below are built from local wall-clock times, so the assertions hold in
// any timezone: dayRange's bounds are themselves expressed via toSqliteUtc of local
// midnights, so the local -> UTC mapping cancels out.
describe('dayRange', () => {
	it('spans local midnight to the next local midnight, regardless of the time of day', () => {
		const day = new Date(2025, 5, 15, 9, 30, 0);
		expect(dayRange(day)).toEqual({
			utcFrom: toSqliteUtc(new Date(2025, 5, 15)),
			utcTo: toSqliteUtc(new Date(2025, 5, 16))
		});
	});

	it('rolls over a month boundary', () => {
		const day = new Date(2025, 0, 31, 23, 0, 0);
		expect(dayRange(day)).toEqual({
			utcFrom: toSqliteUtc(new Date(2025, 0, 31)),
			utcTo: toSqliteUtc(new Date(2025, 1, 1))
		});
	});
});

describe('createdAtForDate', () => {
	it('keeps the real time when the entry is for today', () => {
		const now = new Date(2025, 5, 15, 9, 30, 45);
		expect(createdAtForDate(new Date(2025, 5, 15, 0, 0, 0), now)).toBe(toSqliteUtc(now));
	});

	it('stamps local noon for a past day', () => {
		const now = new Date(2025, 5, 15, 9, 30, 45);
		expect(createdAtForDate(new Date(2025, 5, 10), now)).toBe(
			toSqliteUtc(new Date(2025, 5, 10, 12, 0, 0))
		);
	});

	it('stamps local noon for a future day too (only "today" keeps now)', () => {
		const now = new Date(2025, 5, 15, 9, 30, 45);
		expect(createdAtForDate(new Date(2025, 5, 20), now)).toBe(
			toSqliteUtc(new Date(2025, 5, 20, 12, 0, 0))
		);
	});
});
