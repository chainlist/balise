//! Pure last-write-wins reconcile (ports of the former TS `sync-reconcile`).
//!
//! Newer `updated_at` wins, an exact tie breaks toward the higher device id, and
//! unparseable timestamps lose so we never clobber.

use std::collections::{BTreeSet, HashMap, HashSet};

use serde::{Deserialize, Serialize};

use super::timestamps::parse_db_timestamp;

/// One row in a desk's sync manifest: a live note or a tombstone, with its LWW
/// clock. The pure reconcile algorithms here own it; [`super::manifest`] builds
/// it from the DB and [`super::protocol`] carries it over the wire.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ManifestEntry {
    pub(crate) id: String,
    pub(crate) updated_at: String,
    pub(crate) deleted: bool,
}

/// LWW: incoming wins on a strictly newer clock, or an exact tie broken toward
/// the higher device id. Unparseable timestamps lose, so we never clobber.
pub(crate) fn incoming_wins(
    incoming_at: &str,
    local_at: &str,
    incoming_id: &str,
    local_id: &str,
) -> bool {
    match (parse_db_timestamp(incoming_at), parse_db_timestamp(local_at)) {
        (Some(a), Some(b)) => a > b || (a == b && incoming_id > local_id),
        _ => false,
    }
}

/// The ids whose local version wins and should be sent to the peer. The peer runs
/// the same against swapped arguments, so its "to send" set is exactly what we're
/// missing - no explicit pull list needed.
pub(crate) fn notes_to_send(
    local: &[ManifestEntry],
    remote: &[ManifestEntry],
    local_id: &str,
    remote_id: &str,
) -> Vec<String> {
    let remote_by_id: HashMap<&str, &ManifestEntry> =
        remote.iter().map(|e| (e.id.as_str(), e)).collect();
    let local_wins_ties = local_id > remote_id;
    let mut send = Vec::new();
    for mine in local {
        match remote_by_id.get(mine.id.as_str()) {
            None => send.push(mine.id.clone()),
            Some(theirs) => {
                let wins = match (
                    parse_db_timestamp(&mine.updated_at),
                    parse_db_timestamp(&theirs.updated_at),
                ) {
                    (Some(a), Some(b)) => a > b || (a == b && local_wins_ties),
                    _ => false,
                };
                if wins {
                    send.push(mine.id.clone());
                }
            }
        }
    }
    send
}

/// The desks two peers reconcile this session, computed identically on both ends
/// so the desk-by-desk exchange stays in lockstep: union of the share sets minus
/// the union of the unshared sets, sorted. A desk a peer has never seen isn't in
/// its unshared list, so it's accepted and auto-created (the opt-out model).
pub(crate) fn agreed_desks(
    local_share: &[String],
    local_unshared: &[String],
    remote_share: &[String],
    remote_unshared: &[String],
) -> Vec<String> {
    let refused: HashSet<&str> = local_unshared
        .iter()
        .chain(remote_unshared)
        .map(|s| s.as_str())
        .collect();
    local_share
        .iter()
        .chain(remote_share)
        .filter(|d| !refused.contains(d.as_str()))
        .cloned()
        .collect::<BTreeSet<String>>()
        .into_iter()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(id: &str, updated_at: &str) -> ManifestEntry {
        ManifestEntry {
            id: id.into(),
            updated_at: updated_at.into(),
            deleted: false,
        }
    }

    #[test]
    fn incoming_wins_newer_and_breaks_ties_by_id() {
        assert!(incoming_wins("2026-06-13 12:00:05", "2026-06-13 12:00:00", "a", "b"));
        assert!(!incoming_wins("2026-06-13 12:00:00", "2026-06-13 12:00:05", "b", "a"));
        // exact tie -> higher incoming id wins
        assert!(incoming_wins("2026-06-13 12:00:00", "2026-06-13 12:00:00", "b", "a"));
        assert!(!incoming_wins("2026-06-13 12:00:00", "2026-06-13 12:00:00", "a", "b"));
        // mixed timestamp forms compared by parsed time
        assert!(incoming_wins("2026-06-13 12:00:01", "2026-06-13T12:00:00.000Z", "a", "b"));
    }

    #[test]
    fn notes_to_send_picks_local_wins() {
        // peer has never seen it
        assert_eq!(notes_to_send(&[entry("1", "2026-06-13 12:00:00")], &[], "b", "a"), vec!["1"]);
        // local newer
        assert_eq!(
            notes_to_send(
                &[entry("1", "2026-06-13 12:00:05")],
                &[entry("1", "2026-06-13 12:00:00")],
                "b",
                "a"
            ),
            vec!["1"]
        );
        // peer newer -> stay silent
        assert!(notes_to_send(
            &[entry("1", "2026-06-13 12:00:00")],
            &[entry("1", "2026-06-13 12:00:05")],
            "b",
            "a"
        )
        .is_empty());
        // exact tie -> higher local id sends, lower stays silent
        assert_eq!(
            notes_to_send(
                &[entry("1", "2026-06-13 12:00:00")],
                &[entry("1", "2026-06-13 12:00:00")],
                "b",
                "a"
            ),
            vec!["1"]
        );
        assert!(notes_to_send(
            &[entry("1", "2026-06-13 12:00:00")],
            &[entry("1", "2026-06-13 12:00:00")],
            "a",
            "b"
        )
        .is_empty());
    }

    #[test]
    fn agreed_desks_unions_shares_minus_optouts_sorted() {
        assert_eq!(
            agreed_desks(&["A".into(), "B".into()], &[], &["B".into(), "C".into()], &[]),
            vec!["A", "B", "C"]
        );
        // peer shares a desk we've never seen -> accepted (auto-create path)
        assert_eq!(
            agreed_desks(&["A".into()], &[], &["A".into(), "New".into()], &[]),
            vec!["A", "New"]
        );
        // either side's opt-out excludes the desk
        assert_eq!(
            agreed_desks(&["A".into()], &["B".into()], &["A".into(), "B".into()], &[]),
            vec!["A"]
        );
        assert_eq!(
            agreed_desks(&["A".into(), "B".into()], &[], &["A".into()], &["B".into()]),
            vec!["A"]
        );
    }
}
