/// Writes an exported note (PDF / PNG / JPEG bytes) to a user-chosen absolute
/// path. The destination comes from the native save dialog and can be anywhere
/// on disk, so the write runs here (full disk access) rather than through the
/// scope-limited fs plugin — the same reasoning as `copy_attachment`.
#[tauri::command]
pub fn write_export_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())
}
