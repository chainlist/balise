use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use data_encoding::BASE32_NOPAD;
use iroh::endpoint::{presets, Connection, RecvStream, SendStream};
use iroh::{Endpoint, EndpointAddr, PublicKey, SecretKey};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex as AsyncMutex;

use crate::commands::device::load_or_create_signing_key;

/// ALPN identifying the data-sync stream (manifest + note bodies) over QUIC.
/// Pairing no longer runs over iroh; it goes through the sync server.
const SYNC_DATA_ALPN: &[u8] = b"balise/sync-data/0";

/// Hard cap on a single framed sync message, guarding the recv allocation.
const MAX_SYNC_MESSAGE: usize = 64 * 1024 * 1024;

/// Holds the running iroh endpoint while sync is enabled, `None` when it is off.
#[derive(Default)]
pub struct SyncState(Mutex<Option<Endpoint>>);

/// `sync-session` event payload: an established data-sync stream the frontend
/// drives. `device_id` lets the frontend reject peers that aren't paired.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncSessionOpened {
    session_id: String,
    device_id: String,
}

/// One live data-sync stream pair plus its connection, held so the QUIC streams
/// aren't dropped. The two halves get independent locks so a `sync_send` and a
/// `sync_recv` on the same session can run concurrently without deadlocking.
struct SyncSession {
    _conn: Connection,
    send: AsyncMutex<SendStream>,
    recv: AsyncMutex<RecvStream>,
}

/// Open data-sync sessions keyed by a string id handed to the frontend.
#[derive(Default)]
pub struct SyncSessions {
    next_id: AtomicU64,
    sessions: Mutex<HashMap<String, Arc<SyncSession>>>,
}

impl SyncSessions {
    fn insert(&self, conn: Connection, send: SendStream, recv: RecvStream) -> String {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed).to_string();
        let session = Arc::new(SyncSession {
            _conn: conn,
            send: AsyncMutex::new(send),
            recv: AsyncMutex::new(recv),
        });
        self.sessions.lock().unwrap().insert(id.clone(), session);
        id
    }

    fn get(&self, id: &str) -> Option<Arc<SyncSession>> {
        self.sessions.lock().unwrap().get(id).cloned()
    }

    fn remove(&self, id: &str) {
        self.sessions.lock().unwrap().remove(id);
    }

    fn clear(&self) {
        self.sessions.lock().unwrap().clear();
    }
}

/// Starts the iroh networking layer using this device's persisted Ed25519 seed
/// as its node identity, then spawns the loop that accepts data-sync streams.
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
        app.state::<SyncSessions>().clear();
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
        .alpns(vec![SYNC_DATA_ALPN.to_vec()])
        .bind()
        .await
        .map_err(|e| e.to_string())
}

/// Accepts incoming data-sync connections until the endpoint is closed, handling
/// each on its own task so a slow peer can't block others.
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

/// Routes an incoming connection by its negotiated ALPN. Only data-sync streams
/// are accepted now that pairing goes through the sync server.
async fn handle_incoming(app: &AppHandle, incoming: iroh::endpoint::Incoming) -> Result<(), String> {
    let connection = incoming.await.map_err(|e| e.to_string())?;
    if connection.alpn() == SYNC_DATA_ALPN {
        handle_sync_session(app, connection).await
    } else {
        Err("unknown protocol".to_string())
    }
}

/// Registers an incoming data-sync stream as a session and notifies the
/// frontend (with the peer's device id) so it can drive the protocol - or reject
/// the peer via [`sync_close`] if it isn't paired. `accept_bi` resolves once the
/// dialer sends its first message, so the session id always reaches the frontend
/// with the dialer's manifest already in flight.
async fn handle_sync_session(app: &AppHandle, connection: Connection) -> Result<(), String> {
    let device_id = BASE32_NOPAD.encode(connection.remote_id().as_bytes());
    let (send, recv) = connection.accept_bi().await.map_err(|e| e.to_string())?;
    let session_id = app.state::<SyncSessions>().insert(connection, send, recv);
    app.emit("sync-session", SyncSessionOpened { session_id, device_id })
        .map_err(|e| e.to_string())
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

/// Opens a data-sync stream to a paired peer, returning the session id the
/// frontend drives via [`sync_send`]/[`sync_recv`]. The peer's accept loop only
/// sees the stream once the frontend sends its first message.
#[tauri::command]
pub async fn sync_open(app: AppHandle, device_id: String) -> Result<String, String> {
    let endpoint = app
        .state::<SyncState>()
        .0
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "sync is not running".to_string())?;

    let peer_id = parse_device_id(&device_id)?;
    let conn = endpoint
        .connect(EndpointAddr::from(peer_id), SYNC_DATA_ALPN)
        .await
        .map_err(|e| e.to_string())?;
    let (send, recv) = conn.open_bi().await.map_err(|e| e.to_string())?;
    Ok(app.state::<SyncSessions>().insert(conn, send, recv))
}

/// Sends one length-prefixed message on a session's stream.
#[tauri::command]
pub async fn sync_send(app: AppHandle, session_id: String, data: Vec<u8>) -> Result<(), String> {
    let session = app
        .state::<SyncSessions>()
        .get(&session_id)
        .ok_or_else(|| "sync session not found".to_string())?;
    let len = u32::try_from(data.len()).map_err(|_| "message too large".to_string())?;
    let mut send = session.send.lock().await;
    send.write_all(&len.to_be_bytes()).await.map_err(|e| e.to_string())?;
    send.write_all(&data).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Reads one length-prefixed message from a session's stream.
#[tauri::command]
pub async fn sync_recv(app: AppHandle, session_id: String) -> Result<Vec<u8>, String> {
    let session = app
        .state::<SyncSessions>()
        .get(&session_id)
        .ok_or_else(|| "sync session not found".to_string())?;
    let mut recv = session.recv.lock().await;
    let mut len_buf = [0u8; 4];
    recv.read_exact(&mut len_buf).await.map_err(|e| e.to_string())?;
    let len = u32::from_be_bytes(len_buf) as usize;
    if len > MAX_SYNC_MESSAGE {
        return Err("sync message too large".to_string());
    }
    let mut buf = vec![0u8; len];
    recv.read_exact(&mut buf).await.map_err(|e| e.to_string())?;
    Ok(buf)
}

/// Finishes and forgets a session's stream. Idempotent.
#[tauri::command]
pub async fn sync_close(app: AppHandle, session_id: String) {
    if let Some(session) = app.state::<SyncSessions>().get(&session_id) {
        let _ = session.send.lock().await.finish();
    }
    app.state::<SyncSessions>().remove(&session_id);
}
