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

/** A date found inside a piece of text, with the substring's bounds and its value. */
export interface DateMatch {
	index: number;
	text: string;
	date: Date;
}

/**
 * Find every substring of `text` written as a date in the given `format`/`locale`
 * and pair each with its parsed `Date`. Only canonical renderings count: each
 * candidate is re-formatted with {@link formatDate} and compared to the matched
 * text, so invalid days (`2025-13-40`), wrong padding, or stray digit runs are
 * rejected. This makes detection round-trip exactly what the date picker inserts.
 */
export function findDates(text: string, format: DateFormat, locale: string): DateMatch[] {
	const { regex, parse } = dateMatcher(format, locale);
	regex.lastIndex = 0;
	const out: DateMatch[] = [];
	let m: RegExpExecArray | null;
	while ((m = regex.exec(text)) !== null) {
		const date = parse(m);
		if (date && formatDate(date, format, locale) === m[0]) {
			out.push({ index: m.index, text: m[0], date });
		}
	}
	return out;
}

// A reference date with a distinct day, month and year so the formatted parts are
// unambiguous to inspect: 22 November 2023.
const REF_DATE = new Date(2023, 10, 22);

interface DateMatcher {
	regex: RegExp;
	parse: (m: RegExpExecArray) => Date | null;
}

// Build a regex + parser pair for one format/locale by reading the layout
// `Intl.DateTimeFormat` produces (field order, separators, numeric-vs-named month),
// so the matcher follows the same locale rules as `formatDate`.
function dateMatcher(format: DateFormat, locale: string): DateMatcher {
	if (format === 'iso') {
		return {
			regex: /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g,
			parse: (m) => makeDate(+m[1], +m[2] - 1, +m[3])
		};
	}

	const dtf = new Intl.DateTimeFormat(locale, { dateStyle: format });
	let monthNames: string[] | null = null;
	let src = '';
	for (const part of dtf.formatToParts(REF_DATE)) {
		switch (part.type) {
			case 'day':
				src += '(?<day>\\d{1,2})';
				break;
			case 'year':
				src += '(?<year>\\d{2,4})';
				break;
			case 'month':
				if (/^\d+$/.test(part.value)) {
					src += '(?<month>\\d{1,2})';
				} else {
					monthNames = fieldTokens(dtf, 'month', (i) => new Date(2023, i, 15), 12);
					src += `(?<month>${alternation(monthNames)})`;
				}
				break;
			case 'weekday':
				// 1 Jan 2023 is a Sunday; match (but don't capture) any weekday name.
				src += `(?:${alternation(fieldTokens(dtf, 'weekday', (i) => new Date(2023, 0, 1 + i), 7))})`;
				break;
			default:
				src += escapeRegExp(part.value);
		}
	}

	const names = monthNames;
	return {
		regex: new RegExp(`(?<!\\d)${src}(?!\\d)`, 'g'),
		parse: (m) => {
			const g = m.groups!;
			const year = g.year.length <= 2 ? 2000 + +g.year : +g.year;
			const month = names ? names.indexOf(g.month) : +g.month - 1;
			return makeDate(year, month, +g.day);
		}
	};
}

// The locale's rendered strings for one field (e.g. every month or weekday name),
// read back from the same formatter so they match `formatDate`'s output exactly.
function fieldTokens(
	dtf: Intl.DateTimeFormat,
	type: Intl.DateTimeFormatPartTypes,
	dateFor: (i: number) => Date,
	count: number
): string[] {
	return Array.from({ length: count }, (_, i) => {
		const part = dtf.formatToParts(dateFor(i)).find((p) => p.type === type);
		return part ? part.value : '';
	});
}

// Longest token first so a name never matches as the prefix of a longer one.
function alternation(tokens: string[]): string {
	return [...tokens]
		.sort((a, b) => b.length - a.length)
		.map(escapeRegExp)
		.join('|');
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Construct a local date, returning null for impossible field combinations
// (the Date constructor would otherwise roll them over, e.g. month 13 → next year).
function makeDate(year: number, month: number, day: number): Date | null {
	if (month < 0 || month > 11 || day < 1 || day > 31) return null;
	const d = new Date(year, month, day);
	if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
	return d;
}
