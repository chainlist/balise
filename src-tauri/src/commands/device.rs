use data_encoding::BASE32_NOPAD;
use sha2::{Digest, Sha256};

/// Returns a stable, non-random identifier for this device.
///
/// Derived from the OS machine UID (Windows registry MachineGuid, macOS
/// IOPlatformUUID, Linux /etc/machine-id) hashed with SHA-256. The first 128
/// bits of the digest are Base32-encoded into a 26-character code. The same
/// machine always yields the same value, and it is independent of the desk or
/// app data. 128 bits keeps it collision-resistant for a public registry.
#[tauri::command]
pub fn device_id() -> Result<String, String> {
    let uid = machine_uid::get().map_err(|e| e.to_string())?;
    let digest = Sha256::digest(uid.as_bytes());

    Ok(BASE32_NOPAD.encode(&digest[..16]))
}
