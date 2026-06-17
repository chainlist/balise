use std::time::SystemTime;
use tauri::Manager;

/// Sets a desk note file's modified time. The frontend pins it to the note's
/// logical `updated_at` so fs-sync (which uses mtime to detect edits) doesn't
/// mistake our own write for a newer external change and re-import it.
#[tauri::command]
pub fn set_desk_file_mtime(
    app: tauri::AppHandle,
    desk_name: String,
    name: String,
    mtime_ms: u64,
) -> Result<(), String> {
    let docs_dir = app.path().document_dir().map_err(|e| e.to_string())?;
    let path = docs_dir.join("Balise").join(&desk_name).join(&name);
    let mtime = SystemTime::UNIX_EPOCH + std::time::Duration::from_millis(mtime_ms);
    std::fs::OpenOptions::new()
        .write(true)
        .open(&path)
        .and_then(|file| file.set_modified(mtime))
        .map_err(|e| e.to_string())
}
