use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use data_encoding::BASE32_NOPAD;
use iroh::{endpoint::presets, Endpoint, EndpointAddr, PublicKey, SecretKey};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::oneshot;

use crate::commands::device::load_or_create_signing_key;

/// ALPN identifying Balise's note-sync protocol over QUIC.
const SYNC_ALPN: &[u8] = b"balise/sync/0";

/// How long each side waits for the pairing handshake to complete. The
/// accepting side spends most of this waiting for the user to tap accept/reject.
const PAIRING_TIMEOUT: Duration = Duration::from_secs(120);

/// Reply the accepting side sends back to the dialer.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct PairingReply {
    accepted: bool,
}

/// `pairing-request` event payload: an incoming request awaiting the user's
/// decision, which the frontend answers via [`respond_pairing`]. Only the
/// authenticated peer key is shared; the user names the device locally.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PairingRequest {
    request_id: String,
    device_id: String,
}

/// Holds the running iroh endpoint while sync is enabled, `None` when it is off.
#[derive(Default)]
pub struct SyncState(Mutex<Option<Endpoint>>);

/// Pending incoming pairing requests keyed by request id, each holding the
/// channel the user's accept/reject decision is delivered on.
#[derive(Default)]
pub struct PairingState {
    next_id: AtomicU64,
    pending: Mutex<HashMap<String, oneshot::Sender<bool>>>,
}

/// Starts the iroh networking layer using this device's persisted Ed25519 seed
/// as its node identity, then spawns the loop that accepts pairing requests.
/// No-op if already running.
async fn start(app: &AppHandle) -> Result<(), String> {
    if app.state::<SyncState>().0.lock().unwrap().is_some() {
        return Ok(());
    }

    let endpoint = bind(app).await?;
    log::info!("iroh endpoint started: {}", endpoint.id());
    spawn_accept_loop(app.clone(), endpoint.clone());
    *app.state::<SyncState>().0.lock().unwrap() = Some(endpoint);
    Ok(())
}

/// Stops the iroh networking layer, shutting down the QUIC socket, relay link
/// and discovery. Closing the endpoint ends the accept loop. No-op if not running.
async fn stop(app: &AppHandle) {
    let endpoint = app.state::<SyncState>().0.lock().unwrap().take();
    if let Some(endpoint) = endpoint {
        endpoint.close().await;
        log::info!("iroh endpoint stopped");
    }
}

/// Binds an iroh endpoint on n0's default relays and discovery.
async fn bind(app: &AppHandle) -> Result<Endpoint, String> {
    let seed = load_or_create_signing_key(app)?.to_bytes();
    let secret_key = SecretKey::from_bytes(&seed);

    Endpoint::builder(presets::N0)
        .secret_key(secret_key)
        .alpns(vec![SYNC_ALPN.to_vec()])
        .bind()
        .await
        .map_err(|e| e.to_string())
}

/// Accepts incoming pairing connections until the endpoint is closed, handling
/// each on its own task so a slow user decision can't block other peers.
fn spawn_accept_loop(app: AppHandle, endpoint: Endpoint) {
    tauri::async_runtime::spawn(async move {
        while let Some(incoming) = endpoint.accept().await {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = handle_incoming(&app, incoming).await {
                    log::warn!("pairing connection failed: {e}");
                }
            });
        }
    });
}

/// Identifies the dialing peer, asks the user, and replies with the decision.
async fn handle_incoming(app: &AppHandle, incoming: iroh::endpoint::Incoming) -> Result<(), String> {
    let connection = incoming.await.map_err(|e| e.to_string())?;
    let device_id = BASE32_NOPAD.encode(connection.remote_id().as_bytes());
    let (mut send, mut recv) = connection.accept_bi().await.map_err(|e| e.to_string())?;

    // Drain the dialer's hello so the stream is fully established.
    recv.read_to_end(1024).await.map_err(|e| e.to_string())?;

    let accepted = ask_user(app, device_id).await;
    let bytes = serde_json::to_vec(&PairingReply { accepted }).map_err(|e| e.to_string())?;
    send.write_all(&bytes).await.map_err(|e| e.to_string())?;
    send.finish().map_err(|e| e.to_string())?;
    // Give the dialer time to read the reply before the connection drops.
    let _ = tokio::time::timeout(Duration::from_secs(10), connection.closed()).await;
    Ok(())
}

/// Emits a `pairing-request` event and blocks until the user responds via
/// [`respond_pairing`] or the timeout elapses (treated as a rejection).
async fn ask_user(app: &AppHandle, device_id: String) -> bool {
    let state = app.state::<PairingState>();
    let request_id = state.next_id.fetch_add(1, Ordering::Relaxed).to_string();
    let (tx, rx) = oneshot::channel();
    state.pending.lock().unwrap().insert(request_id.clone(), tx);

    let emitted = app.emit(
        "pairing-request",
        PairingRequest {
            request_id: request_id.clone(),
            device_id,
        },
    );
    if emitted.is_err() {
        state.pending.lock().unwrap().remove(&request_id);
        return false;
    }

    match tokio::time::timeout(PAIRING_TIMEOUT, rx).await {
        Ok(Ok(decision)) => decision,
        _ => {
            state.pending.lock().unwrap().remove(&request_id);
            false
        }
    }
}

/// Dials a peer by its device id and runs the pairing handshake, returning
/// whether the peer accepted.
async fn dial_and_pair(endpoint: &Endpoint, peer_id: PublicKey) -> Result<bool, String> {
    let conn = endpoint
        .connect(EndpointAddr::from(peer_id), SYNC_ALPN)
        .await
        .map_err(|e| e.to_string())?;
    let (mut send, mut recv) = conn.open_bi().await.map_err(|e| e.to_string())?;

    send.write_all(b"pair").await.map_err(|e| e.to_string())?;
    send.finish().map_err(|e| e.to_string())?;

    let bytes = recv.read_to_end(1024).await.map_err(|e| e.to_string())?;
    let reply: PairingReply = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    conn.close(0u32.into(), b"done");
    Ok(reply.accepted)
}

/// Decodes a Base32 device id into the Ed25519 public key used as a node id.
fn parse_device_id(device_id: &str) -> Result<PublicKey, String> {
    let bytes = BASE32_NOPAD
        .decode(device_id.as_bytes())
        .map_err(|_| "invalid device id".to_string())?;
    let key: [u8; 32] = bytes
        .as_slice()
        .try_into()
        .map_err(|_| "invalid device id".to_string())?;
    PublicKey::from_bytes(&key).map_err(|_| "invalid device id".to_string())
}

/// Starts sync. Invoked by the frontend when the user enables sync and, on
/// launch, when sync was previously enabled.
#[tauri::command]
pub async fn start_sync(app: AppHandle) -> Result<(), String> {
    start(&app).await
}

/// Stops sync. Invoked by the frontend when the user disables sync.
#[tauri::command]
pub async fn stop_sync(app: AppHandle) {
    stop(&app).await;
}

/// Dials another device by its id and asks it to pair. Resolves to whether the
/// other end accepted; errors if sync is off, the id is invalid, or the peer is
/// unreachable.
#[tauri::command]
pub async fn pair_device(app: AppHandle, device_id: String) -> Result<bool, String> {
    let endpoint = app
        .state::<SyncState>()
        .0
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "sync is not running".to_string())?;

    let peer_id = parse_device_id(&device_id)?;
    if peer_id == endpoint.id() {
        return Err("cannot pair with this device".to_string());
    }

    tokio::time::timeout(PAIRING_TIMEOUT, dial_and_pair(&endpoint, peer_id))
        .await
        .map_err(|_| "pairing timed out".to_string())?
}

/// Delivers the user's accept/reject decision to the waiting accept-side task.
#[tauri::command]
pub fn respond_pairing(app: AppHandle, request_id: String, accept: bool) {
    let sender = app
        .state::<PairingState>()
        .pending
        .lock()
        .unwrap()
        .remove(&request_id);
    if let Some(sender) = sender {
        let _ = sender.send(accept);
    }
}
