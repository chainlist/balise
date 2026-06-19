/** Date formats offered in settings and used wherever a date is inserted. */
export const DATE_FORMATS = ['short', 'medium', 'long', 'full', 'iso'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

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
