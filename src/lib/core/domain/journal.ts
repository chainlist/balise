// Journal domain: the pure day-range and entry-stamp rules for the journal view
// (the notes carrying the system `journal` tag, browsed by date). No I/O, no
// Svelte, no Tauri — `now` is passed in so the rules stay deterministic and
// testable. The journal is a *view* over Notes: there is no journal table and no
// journal repo; the note queries live in `note.repo.ts`.

import { toSqliteUtc } from './shared/time';
import { SYSTEM_TAGS } from './tag';

/** The system tag that marks a note as a journal entry. Single source of truth so
 *  the calendar view and the new-entry seed agree on the name. */
export const JOURNAL_TAG = SYSTEM_TAGS.JOURNAL;

/** Half-open UTC range `[utcFrom, utcTo)` (as SQLite timestamps) covering one local
 *  calendar day: local midnight to the next local midnight. Note rows store UTC, so
 *  a "notes on this local day" query filters `created_at` against these bounds. */
export function dayRange(localDate: Date): { utcFrom: string; utcTo: string } {
	const y = localDate.getFullYear();
	const mo = localDate.getMonth();
	const d = localDate.getDate();
	return {
		utcFrom: toSqliteUtc(new Date(y, mo, d)),
		utcTo: toSqliteUtc(new Date(y, mo, d + 1))
	};
}

/** Creation timestamp for a journal entry on `localDate`. Today keeps its real time
 *  (`now`) so the entry sorts by when it was actually written; any other day gets
 *  local noon, a stable DST-safe midday that always lands inside that day's
 *  {@link dayRange}. */
export function createdAtForDate(localDate: Date, now: Date): string {
	const isToday =
		now.getFullYear() === localDate.getFullYear() &&
		now.getMonth() === localDate.getMonth() &&
		now.getDate() === localDate.getDate();
	if (isToday) return toSqliteUtc(now);
	return toSqliteUtc(
		new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 12, 0, 0)
	);
}
