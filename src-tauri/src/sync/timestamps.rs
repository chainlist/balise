//! DB timestamp parsing and formatting (port of `time.ts`).

use chrono::{TimeZone, Utc};

/// Parse either DB timestamp form ('YYYY-MM-DD HH:MM:SS' UTC or ISO 8601) to
/// epoch ms. `None` on unparseable input - callers treat that as "not newer"
/// to avoid clobbering, mirroring JS `NaN` comparisons being false.
pub(crate) fn parse_db_timestamp(ts: &str) -> Option<i64> {
    let normalized = if ts.contains('T') {
        ts.to_string()
    } else {
        format!("{}Z", ts.replacen(' ', "T", 1))
    };
    chrono::DateTime::parse_from_rfc3339(&normalized)
        .ok()
        .map(|dt| dt.timestamp_millis())
}

/// Format epoch ms as an ISO 8601 UTC string with ms precision, matching JS
/// `new Date(ms).toISOString()` (`YYYY-MM-DDTHH:MM:SS.sssZ`).
pub(crate) fn ms_to_iso_utc(ms: i64) -> String {
    Utc.timestamp_millis_opt(ms)
        .single()
        .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string())
        .unwrap_or_default()
}
