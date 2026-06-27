use font_kit::source::SystemSource;

/// Lists the names of every font family installed on the OS, sorted
/// case-insensitively. Backs the editor font-family setting. Uses the native
/// font source per platform (DirectWrite on Windows, Core Text on macOS,
/// fontconfig on Linux), so the webview never needs the `local-fonts` web API.
#[tauri::command]
pub fn list_fonts() -> Result<Vec<String>, String> {
    let mut families = SystemSource::new()
        .all_families()
        .map_err(|e| e.to_string())?;
    families.sort_by_key(|name| name.to_lowercase());
    Ok(families)
}
