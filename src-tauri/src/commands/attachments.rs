use tauri::Manager;

/// Copies a user-picked file into a desk's `attachments/` folder under the given
/// filename. The source is chosen via the native dialog and can live anywhere on
/// disk, so the copy runs here (full disk access) rather than through the
/// scope-limited fs plugin. Mirrors the `Documents/Balise/{desk}` layout used by
/// `set_desk_file_mtime`.
#[tauri::command]
pub fn copy_attachment(
    app: tauri::AppHandle,
    desk_name: String,
    src_path: String,
    filename: String,
) -> Result<(), String> {
    let docs_dir = app.path().document_dir().map_err(|e| e.to_string())?;
    let dir = docs_dir.join("Balise").join(&desk_name).join("attachments");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::copy(&src_path, dir.join(&filename)).map_err(|e| e.to_string())?;
    Ok(())
}
