// Timestamp conventions, in one place.
//
// Three timestamp shapes exist in the app:
// - SQLite's datetime('now') default: 'YYYY-MM-DD HH:MM:SS' (UTC, second precision)
// - JS Date#toISOString(): 'YYYY-MM-DDTHH:MM:SS.sssZ' (UTC, millisecond precision)
// - File mtimes: epoch milliseconds
//
// Both string forms live in the same DB columns and frontmatter. That is
// deliberate: fs-sync compares file mtimes against DB rows, so rows written
// during sync must keep millisecond precision (ISO) or the comparison would
// re-trigger forever, while app-written rows use SQLite's second-precision
// default. Always go through parseDbTimestamp to compare them.

/** Format a Date as SQLite's 'YYYY-MM-DD HH:MM:SS' (UTC, second precision). */
export function toSqliteUtc(d: Date): string {
	return d.toISOString().replace('T', ' ').slice(0, 19);
}

/** Parse either DB timestamp form ('YYYY-MM-DD HH:MM:SS' UTC or ISO 8601) to epoch ms. */
export function parseDbTimestamp(ts: string): number {
	return new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z').getTime();
}

/** Reduce a DB timestamp to the local 'YYYY-MM-DD' day it falls on. */
export function toLocalDayKey(ts: string): string {
	const d = new Date(parseDbTimestamp(ts));
	const mo = String(d.getMonth() + 1).padStart(2, '0');
	const da = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mo}-${da}`;
}

/** Reduce DB timestamps to the set of local 'YYYY-MM-DD' days they fall on. */
export function toLocalDayKeys(stamps: string[]): Set<string> {
	const days = new Set<string>();
	for (const ts of stamps) days.add(toLocalDayKey(ts));
	return days;
}

/** Count DB timestamps per local 'YYYY-MM-DD' day. */
export function toLocalDayCounts(stamps: string[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const ts of stamps) {
		const key = toLocalDayKey(ts);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}
