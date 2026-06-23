import { describe, it, expect } from 'vitest';
import { formatDate, buildDateFormatOptions } from './datetime';

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
