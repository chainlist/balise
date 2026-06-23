// User-facing date formatting for insertion and display. Pure: no I/O, no Svelte,
// no Tauri. The `DateFormat` setting (its allowed values) is owned by the settings
// domain; this module turns a `Date` into the string that format names. Distinct
// from `shared/time.ts`, which handles machine-readable DB/file timestamps.

import type { DateFormat } from './settings';

const DATE_FORMATS: readonly DateFormat[] = ['short', 'medium', 'long', 'full', 'iso'];

/**
 * Format a date for insertion into a note. `iso` produces a sortable
 * `YYYY-MM-DD`; the others delegate to `Intl.DateTimeFormat` so they follow the
 * user's language (matching how dates are displayed elsewhere in the app).
 */
export function formatDate(date: Date, format: DateFormat, locale: string): string {
	if (format === 'iso') {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	return new Intl.DateTimeFormat(locale, { dateStyle: format }).format(date);
}

/**
 * Selectable format options for a locale, collapsing entries that render
 * identically (e.g. `medium` and `long` are the same in French). The `selected`
 * format wins its collision group so it stays highlighted.
 */
export function buildDateFormatOptions(
	date: Date,
	locale: string,
	selected: DateFormat
): { value: DateFormat; label: string }[] {
	const seen = new Map<string, DateFormat>();
	for (const f of DATE_FORMATS) {
		const label = formatDate(date, f, locale);
		if (!seen.has(label) || f === selected) seen.set(label, f);
	}
	return [...seen].map(([label, value]) => ({ value, label }));
}
