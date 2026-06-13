use std::fs;
use std::path::PathBuf;

use data_encoding::BASE32_NOPAD;
use ed25519_dalek::SigningKey;
use tauri::Manager;

/// Path to this device's private key, kept machine-local (not in the
/// exportable notes folder) so each device keeps its own identity.
fn key_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("device.key"))
}

/// Loads the persisted Ed25519 key, generating and saving one on first run.
/// The 32-byte seed is the same key material iroh uses for its node identity.
pub(crate) fn load_or_create_signing_key(app: &tauri::AppHandle) -> Result<SigningKey, String> {
    let path = key_path(app)?;

    if let Ok(bytes) = fs::read(&path) {
        if let Ok(seed) = <[u8; 32]>::try_from(bytes.as_slice()) {
            return Ok(SigningKey::from_bytes(&seed));
        }
    }

    let mut seed = [0u8; 32];
    getrandom::getrandom(&mut seed).map_err(|e| e.to_string())?;
    let key = SigningKey::from_bytes(&seed);

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, seed).map_err(|e| e.to_string())?;

    Ok(key)
}

/// Returns this device's stable identity: the Base32-encoded Ed25519 public
/// key. A peer needs this full key to dial and authenticate this device, so it
/// is the value shown in the UI and embedded in the pairing QR code.
#[tauri::command]
pub fn device_id(app: tauri::AppHandle) -> Result<String, String> {
    let key = load_or_create_signing_key(&app)?;
    Ok(BASE32_NOPAD.encode(key.verifying_key().as_bytes()))
}
