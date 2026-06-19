//! A local, read-only MCP server exposing this device's notes to AI clients.
//!
//! The server speaks MCP over Streamable HTTP, bound to loopback only so notes
//! never leave the machine. Its lifecycle mirrors the iroh sync layer: a managed
//! [`McpState`] holds the running server's cancellation token while enabled and
//! `None` when off, and the frontend drives it through [`start_mcp`]/[`stop_mcp`]
//! (on the General > Enable AI Compatibility toggle, and on launch when it was
//! left on).

mod server;

use std::sync::Mutex;

use rmcp::transport::streamable_http_server::{
    session::local::LocalSessionManager, StreamableHttpServerConfig, StreamableHttpService,
};
use tauri::async_runtime::JoinHandle;
use tauri::{AppHandle, Manager};

use server::BaliseMcp;

/// Loopback address + path the MCP server listens on. Fixed so clients have a
/// stable URL; loopback-only keeps notes off the LAN. The frontend mirrors this
/// as `MCP_URL` in `src/lib/utils/mcp.ts`; keep the two in sync.
const BIND_ADDR: &str = "127.0.0.1:4127";

/// Holds the serve task while the MCP server is up, `None` when it is off.
/// Aborting the task drops the listener and frees the port immediately (even if
/// a client is holding a long-lived SSE stream open).
#[derive(Default)]
pub struct McpState(Mutex<Option<JoinHandle<()>>>);

/// Starts the local MCP server. Invoked by the frontend when the user enables AI
/// compatibility and, on launch, when it was previously enabled. No-op if already
/// running. Returns `Err` if the port can't be bound (e.g. already in use) so the
/// frontend can surface a toast.
#[tauri::command]
pub async fn start_mcp(app: AppHandle) -> Result<(), String> {
    if app.state::<McpState>().0.lock().unwrap().is_some() {
        return Ok(());
    }

    let factory_app = app.clone();
    let service = StreamableHttpService::new(
        // A fresh handler per session; each just clones the AppHandle it reads through.
        move || Ok(BaliseMcp::new(factory_app.clone())),
        LocalSessionManager::default().into(),
        StreamableHttpServerConfig::default(),
    );

    let router = axum::Router::new().nest_service("/mcp", service);
    // Bind before storing the handle so a port-in-use failure surfaces as an Err.
    let listener = tokio::net::TcpListener::bind(BIND_ADDR)
        .await
        .map_err(|e| e.to_string())?;
    log::info!("MCP server listening on http://{BIND_ADDR}/mcp");

    let handle = tauri::async_runtime::spawn(async move {
        if let Err(e) = axum::serve(listener, router).await {
            log::warn!("MCP server error: {e}");
        }
    });

    *app.state::<McpState>().0.lock().unwrap() = Some(handle);
    Ok(())
}

/// Stops the local MCP server by aborting its serve task, which drops the
/// listener and frees the port. No-op if not running.
#[tauri::command]
pub async fn stop_mcp(app: AppHandle) {
    let handle = app.state::<McpState>().0.lock().unwrap().take();
    if let Some(handle) = handle {
        handle.abort();
        log::info!("MCP server stopped");
    }
}
