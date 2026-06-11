import { describe, it, expect } from 'vitest';
import { toSqliteUtc, msToIsoUtc, parseDbTimestamp } from './time';

describe('toSqliteUtc', () => {
	it('formats a Date as YYYY-MM-DD HH:MM:SS in UTC', () => {
		expect(toSqliteUtc(new Date('2025-01-02T03:04:05.678Z'))).toBe('2025-01-02 03:04:05');
	});
});

describe('msToIsoUtc', () => {
	it('formats epoch ms as ISO 8601 UTC', () => {
		expect(msToIsoUtc(Date.UTC(2025, 0, 2, 3, 4, 5, 678))).toBe('2025-01-02T03:04:05.678Z');
	});
});

describe('parseDbTimestamp', () => {
	it('parses the SQLite space-separated form as UTC', () => {
		expect(parseDbTimestamp('2025-01-02 03:04:05')).toBe(Date.UTC(2025, 0, 2, 3, 4, 5));
	});

	it('parses ISO 8601 with milliseconds', () => {
		expect(parseDbTimestamp('2025-01-02T03:04:05.678Z')).toBe(Date.UTC(2025, 0, 2, 3, 4, 5, 678));
	});

	it('round-trips msToIsoUtc without losing precision (fs-sync echo invariant)', () => {
		const ms = Date.UTC(2025, 5, 11, 12, 0, 0, 123);
		expect(parseDbTimestamp(msToIsoUtc(ms))).toBe(ms);
	});

	it('round-trips toSqliteUtc at second precision', () => {
		const d = new Date('2025-06-11T12:00:42.000Z');
		expect(parseDbTimestamp(toSqliteUtc(d))).toBe(d.getTime());
	});
});
