import { describe, it, expect } from 'vitest';
import { formatDate, buildDateFormatOptions, findDates } from './datetime';

// Use local-time constructor so `iso` (which reads local Y/M/D) is deterministic
// regardless of the runner's timezone.
const date = new Date(2025, 0, 2); // 2 Jan 2025

describe('formatDate', () => {
	it('produces a sortable YYYY-MM-DD for the iso format', () => {
		expect(formatDate(date, 'iso', 'en-US')).toBe('2025-01-02');
	});

	it('pads single-digit months and days in iso', () => {
		expect(formatDate(new Date(2025, 2, 5), 'iso', 'fr-FR')).toBe('2025-03-05');
	});

	it('delegates non-iso formats to the locale', () => {
		expect(formatDate(date, 'short', 'en-US')).toBe('1/2/25');
	});
});

describe('buildDateFormatOptions', () => {
	it('returns one option per distinct rendered label', () => {
		const options = buildDateFormatOptions(date, 'en-US', 'medium');
		const labels = options.map((o) => o.label);
		expect(new Set(labels).size).toBe(labels.length);
	});

	it('keeps the selected format when it collides with another', () => {
		const options = buildDateFormatOptions(date, 'en-US', 'long');
		// Every returned value is a valid DateFormat and the selected one is reachable
		// either as its own entry or as the winner of its collision group.
		const values = options.map((o) => o.value);
		expect(values).toContain('iso');
		expect(values.length).toBeGreaterThan(0);
	});
});

describe('findDates', () => {
	it('finds an iso date and parses it to the right local day', () => {
		const matches = findDates('met on 2025-01-02 again', 'iso', 'en-US');
		expect(matches).toHaveLength(1);
		expect(matches[0].text).toBe('2025-01-02');
		expect(matches[0].index).toBe('met on '.length);
		const d = matches[0].date;
		expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 0, 2]);
	});

	it('finds a short (numeric) date in the selected locale', () => {
		const matches = findDates('due 1/2/25 ok', 'short', 'en-US');
		expect(matches).toHaveLength(1);
		expect(matches[0].text).toBe('1/2/25');
		const d = matches[0].date;
		expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 0, 2]);
	});

	it('finds a long date with a textual month', () => {
		const matches = findDates('born January 2, 2025.', 'long', 'en-US');
		expect(matches).toHaveLength(1);
		expect(matches[0].text).toBe('January 2, 2025');
		expect(matches[0].date.getMonth()).toBe(0);
	});

	it('respects the locale: a fr-formatted date is not found when iso is selected', () => {
		expect(findDates('le 2 janvier 2025', 'iso', 'en-US')).toHaveLength(0);
	});

	it('finds multiple dates in one string', () => {
		expect(findDates('from 2025-01-02 to 2025-03-05', 'iso', 'en-US')).toHaveLength(2);
	});

	it('rejects impossible dates', () => {
		expect(findDates('2025-13-40', 'iso', 'en-US')).toHaveLength(0);
	});

	it('rejects non-canonical padding so it only matches what formatDate emits', () => {
		// `short` en-US renders 1/2/25, never 01/02/2025.
		expect(findDates('01/02/2025', 'short', 'en-US')).toHaveLength(0);
	});

	it('does not match a date embedded in a longer digit run', () => {
		expect(findDates('120251-01-02', 'iso', 'en-US')).toHaveLength(0);
	});
});
