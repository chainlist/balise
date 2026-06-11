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

/** Format an epoch-milliseconds value as an ISO 8601 UTC string (ms precision). */
export function msToIsoUtc(ms: number): string {
	return new Date(ms).toISOString();
}

/** Parse either DB timestamp form ('YYYY-MM-DD HH:MM:SS' UTC or ISO 8601) to epoch ms. */
export function parseDbTimestamp(ts: string): number {
	return new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z').getTime();
}
