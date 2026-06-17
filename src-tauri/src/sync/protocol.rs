//! The symmetric sync wire protocol over a single QUIC stream.
//!
//! One full exchange agrees on the desk set via a preamble, then reconciles each
//! agreed desk: a `digest` swap that skips the desk when both sides already match,
//! else a `manifest` swap followed by `notes`. Dialer and responder run the same
//! [`run_protocol`], so they stay in lockstep. Messages are length-prefixed JSON.

use std::collections::HashSet;

use iroh::endpoint::{RecvStream, SendStream};
use serde::{Deserialize, Serialize};
use sqlx::Connection;
use tauri::{AppHandle, Emitter};

use super::desk_db::{ensure_desk_db, list_desks};
use super::extract::MagicTag;
use super::manifest::{apply_notes, build_manifest, gc_tombstones, select_notes, SyncedNote};
use super::paths::resolve_desk_dir;
use super::reconcile::{agreed_desks, manifest_digest, notes_to_send, ManifestEntry};

/// Hard cap on a single framed sync message, guarding the recv allocation.
const MAX_SYNC_MESSAGE: usize = 64 * 1024 * 1024;

/// Messages exchanged over the sync stream: a `desks` preamble to agree on the
/// set to reconcile, then per agreed desk a `digest` swap (which skips the desk
/// when both fingerprints match) and, if they differ, a `manifest` swap followed
/// by `notes`.
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum SyncMessage {
    Desks { share: Vec<String>, unshared: Vec<String> },
    Digest { desk: String, digest: String },
    Manifest { desk: String, entries: Vec<ManifestEntry> },
    Notes { desk: String, notes: Vec<SyncedNote> },
}

/// What one protocol run produced locally, surfaced to the frontend so it can
/// refresh the active desk and the desk list.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SyncResult {
    device_id: String,
    created_desk: bool,
    changed_desks: Vec<String>,
}

pub(crate) struct SyncOutcome {
    pub(crate) created_desk: bool,
    pub(crate) changed_desks: Vec<String>,
}

/// One full exchange: agree on the desk set via the preamble, then reconcile each
/// agreed desk over the single stream. Symmetric, so dialer and responder run
/// this same routine and stay in lockstep.
pub(crate) async fn run_protocol(
    app: &AppHandle,
    local_id: &str,
    remote_id: &str,
    send: &mut SendStream,
    recv: &mut RecvStream,
    unshared: &[String],
    magic_tags: &[MagicTag],
) -> Result<SyncOutcome, String> {
    let local_desks = list_desks(app);
    let have: HashSet<String> = local_desks.iter().cloned().collect();
    let share: Vec<String> = local_desks
        .into_iter()
        .filter(|d| !unshared.contains(d))
        .collect();

    let preamble = SyncMessage::Desks {
        share: share.clone(),
        unshared: unshared.to_vec(),
    };
    let (w, r) = tokio::join!(write_msg(send, &preamble), read_msg(recv));
    w?;
    let (peer_share, peer_unshared) = match r? {
        SyncMessage::Desks { share, unshared } => (share, unshared),
        _ => return Err("expected desks".to_string()),
    };

    let agreed = agreed_desks(&share, unshared, &peer_share, &peer_unshared);
    let mut created_desk = false;
    let mut changed_desks = Vec::new();

    for desk in &agreed {
        // A desk's folder (what `list_desks` reports) and its DB live under
        // different roots, so a listed desk can still be missing its DB. Ensure it
        // rather than failing the whole exchange; `created_desk` still tracks only
        // desks whose folder we hadn't seen, which is what the frontend refreshes on.
        if !have.contains(desk) {
            created_desk = true;
        }
        let mut conn = ensure_desk_db(app, desk).await?;

        // Drop expired tombstones before advertising them, so a delete doesn't ride
        // in every manifest forever.
        gc_tombstones(&mut conn).await?;
        let local_manifest = build_manifest(&mut conn).await?;

        // Digest gate: a desk both sides already hold identically reconciles to a
        // no-op, so swap just a fingerprint of the manifest first and skip the desk
        // outright when they match. Both ends derive the same decision from the same
        // two digests, so they stay in lockstep on whether to go on to the manifest.
        let local_digest = manifest_digest(&local_manifest);
        let digest_msg = SyncMessage::Digest {
            desk: desk.clone(),
            digest: local_digest.clone(),
        };
        let (w, r) = tokio::join!(write_msg(send, &digest_msg), read_msg(recv));
        w?;
        let peer_digest = match r? {
            SyncMessage::Digest { digest, .. } => digest,
            _ => return Err("expected digest".to_string()),
        };
        if local_digest == peer_digest {
            let _ = conn.close().await;
            continue;
        }

        let desk_dir = resolve_desk_dir(app, desk)?;
        let manifest_msg = SyncMessage::Manifest {
            desk: desk.clone(),
            entries: local_manifest.clone(),
        };
        let (w, r) = tokio::join!(write_msg(send, &manifest_msg), read_msg(recv));
        w?;
        let peer_entries = match r? {
            SyncMessage::Manifest { entries, .. } => entries,
            _ => return Err("expected manifest".to_string()),
        };

        let send_ids = notes_to_send(&local_manifest, &peer_entries, local_id, remote_id);
        let payload = select_notes(&mut conn, &send_ids).await?;
        let notes_msg = SyncMessage::Notes {
            desk: desk.clone(),
            notes: payload,
        };
        let (w, r) = tokio::join!(write_msg(send, &notes_msg), read_msg(recv));
        w?;
        let peer_notes = match r? {
            SyncMessage::Notes { notes, .. } => notes,
            _ => return Err("expected notes".to_string()),
        };

        let changed =
            apply_notes(&mut conn, &desk_dir, peer_notes, remote_id, local_id, magic_tags).await?;
        let _ = conn.close().await;
        if changed > 0 {
            changed_desks.push(desk.clone());
        }
    }

    let _ = send.finish();
    Ok(SyncOutcome {
        created_desk,
        changed_desks,
    })
}

/// Writes one length-prefixed JSON message on a stream.
async fn write_msg(send: &mut SendStream, msg: &SyncMessage) -> Result<(), String> {
    let data = serde_json::to_vec(msg).map_err(|e| e.to_string())?;
    let len = u32::try_from(data.len()).map_err(|_| "message too large".to_string())?;
    send.write_all(&len.to_be_bytes()).await.map_err(|e| e.to_string())?;
    send.write_all(&data).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Reads one length-prefixed JSON message from a stream.
async fn read_msg(recv: &mut RecvStream) -> Result<SyncMessage, String> {
    let mut len_buf = [0u8; 4];
    recv.read_exact(&mut len_buf).await.map_err(|e| e.to_string())?;
    let len = u32::from_be_bytes(len_buf) as usize;
    if len > MAX_SYNC_MESSAGE {
        return Err("sync message too large".to_string());
    }
    let mut buf = vec![0u8; len];
    recv.read_exact(&mut buf).await.map_err(|e| e.to_string())?;
    serde_json::from_slice(&buf).map_err(|e| e.to_string())
}

pub(crate) fn emit_result(app: &AppHandle, remote_id: &str, outcome: SyncOutcome) {
    let _ = app.emit(
        "sync-result",
        SyncResult {
            device_id: remote_id.to_string(),
            created_desk: outcome.created_desk,
            changed_desks: outcome.changed_desks,
        },
    );
}
