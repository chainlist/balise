use std::fs;
use std::path::PathBuf;

use data_encoding::{BASE32_NOPAD, HEXLOWER, HEXLOWER_PERMISSIVE};
use ed25519_dalek::{Signer, SigningKey};
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

/// Returns this device's public key as lowercase hex (64 chars). The sync server
/// identifies devices by the hex-encoded key, so registration sends this form.
#[tauri::command]
pub fn public_key_hex(app: tauri::AppHandle) -> Result<String, String> {
    let key = load_or_create_signing_key(&app)?;
    Ok(HEXLOWER.encode(key.verifying_key().as_bytes()))
}

/// Signs a server challenge with this device's Ed25519 key, proving ownership of
/// the key without revealing it. `nonce` is the hex-encoded nonce from the
/// server; the returned signature is hex-encoded.
#[tauri::command]
pub fn sign_challenge(app: tauri::AppHandle, nonce: String) -> Result<String, String> {
    let key = load_or_create_signing_key(&app)?;
    let message = HEXLOWER_PERMISSIVE
        .decode(nonce.as_bytes())
        .map_err(|_| "invalid nonce".to_string())?;
    let signature = key.sign(&message);
    Ok(HEXLOWER.encode(&signature.to_bytes()))
}

/// Converts a hex-encoded public key (as returned by the sync server for a peer)
/// into the Base32 device id the rest of the app uses to dial over iroh.
#[tauri::command]
pub fn device_id_from_public_key(public_key_hex: String) -> Result<String, String> {
    let bytes = HEXLOWER_PERMISSIVE
        .decode(public_key_hex.as_bytes())
        .map_err(|_| "invalid public key".to_string())?;
    if bytes.len() != 32 {
        return Err("invalid public key".to_string());
    }
    Ok(BASE32_NOPAD.encode(&bytes))
}
