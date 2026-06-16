//! Note sync for desks, in two halves that share the same DB/FS data layer:
//!
//! - **Filesystem sync** ([`fs_sync`]): mirrors a desk's `.md` files against its
//!   SQLite DB on demand (e.g. a desk switch), entirely in Rust.
//! - **Device sync** ([`transport`] + [`protocol`] + [`commands`]): reconciles
//!   desks peer-to-peer over iroh using last-write-wins.
//!
//! Shared layers: [`paths`] (where a desk lives), [`migrations`]/[`desk_db`]
//! (schema + connections), [`note_file`] (the `{id}.md` format), [`extract`] /
//! [`timestamps`] (ports of the TS `note-utils`/`time` helpers), [`manifest`]
//! (the device-sync data layer) and [`reconcile`] (pure LWW).

mod commands;
mod desk_db;
mod extract;
mod fs_sync;
mod manifest;
mod migrations;
mod note_file;
mod paths;
mod protocol;
mod reconcile;
mod timestamps;
mod transport;

// Glob re-exports so the `#[tauri::command]` helper items (`__cmd__*`,
// `__tauri_command_name_*`) travel with the commands and `generate_handler!` can
// resolve them at the `sync::` root.
pub use commands::*;
pub use desk_db::*;
pub use fs_sync::*;
pub use transport::{SyncConfig, SyncRunning, SyncState};
