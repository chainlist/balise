import { describe, it, expect } from 'vitest';
import {
	toSqliteUtc,
	parseDbTimestamp,
	toLocalDayKey,
	toLocalDayKeys,
	toLocalDayCounts
} from './time';

describe('toSqliteUtc', () => {
	it('formats a Date as YYYY-MM-DD HH:MM:SS in UTC', () => {
		expect(toSqliteUtc(new Date('2025-01-02T03:04:05.678Z'))).toBe('2025-01-02 03:04:05');
	});
});

describe('parseDbTimestamp', () => {
	it('parses the SQLite space-separated form as UTC', () => {
		expect(parseDbTimestamp('2025-01-02 03:04:05')).toBe(Date.UTC(2025, 0, 2, 3, 4, 5));
	});

	it('parses ISO 8601 with milliseconds', () => {
		expect(parseDbTimestamp('2025-01-02T03:04:05.678Z')).toBe(Date.UTC(2025, 0, 2, 3, 4, 5, 678));
	});

	it('round-trips an ISO ms timestamp without losing precision (fs-sync echo invariant)', () => {
		expect(parseDbTimestamp('2025-06-11T12:00:00.123Z')).toBe(Date.UTC(2025, 5, 11, 12, 0, 0, 123));
	});

	it('round-trips toSqliteUtc at second precision', () => {
		const d = new Date('2025-06-11T12:00:42.000Z');
		expect(parseDbTimestamp(toSqliteUtc(d))).toBe(d.getTime());
	});
});

// Day-key helpers reduce a UTC DB timestamp to its *local* calendar day. The
// stamps below are built from local wall-clock times (via toSqliteUtc), so the
// local -> UTC -> local round-trip lands on a deterministic day in any timezone.
describe('toLocalDayKey', () => {
	it('reduces a timestamp to its local YYYY-MM-DD day', () => {
		const ts = toSqliteUtc(new Date(2025, 5, 15, 12, 0, 0));
		expect(toLocalDayKey(ts)).toBe('2025-06-15');
	});

	it('zero-pads single-digit month and day', () => {
		const ts = toSqliteUtc(new Date(2025, 0, 3, 12, 0, 0));
		expect(toLocalDayKey(ts)).toBe('2025-01-03');
	});
});

describe('toLocalDayKeys', () => {
	it('collapses stamps on the same local day and dedupes across days', () => {
		const morning = toSqliteUtc(new Date(2025, 5, 15, 9, 0, 0));
		const evening = toSqliteUtc(new Date(2025, 5, 15, 18, 0, 0));
		const nextDay = toSqliteUtc(new Date(2025, 5, 16, 12, 0, 0));
		expect(toLocalDayKeys([morning, evening, nextDay])).toEqual(
			new Set(['2025-06-15', '2025-06-16'])
		);
	});

	it('returns an empty set for no stamps', () => {
		expect(toLocalDayKeys([])).toEqual(new Set());
	});
});

describe('toLocalDayCounts', () => {
	it('counts stamps per local day', () => {
		const morning = toSqliteUtc(new Date(2025, 5, 15, 9, 0, 0));
		const evening = toSqliteUtc(new Date(2025, 5, 15, 18, 0, 0));
		const nextDay = toSqliteUtc(new Date(2025, 5, 16, 12, 0, 0));
		expect(toLocalDayCounts([morning, evening, nextDay])).toEqual(
			new Map([
				['2025-06-15', 2],
				['2025-06-16', 1]
			])
		);
	});

	it('returns an empty map for no stamps', () => {
		expect(toLocalDayCounts([])).toEqual(new Map());
	});
});
