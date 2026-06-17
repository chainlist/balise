//! Where a desk's files and SQLite DB live on disk.

use std::path::PathBuf;

use tauri::Manager;

/// The `Documents/Balise/{desk}` folder holding a desk's `.md` files.
pub(crate) fn resolve_desk_dir(app: &tauri::AppHandle, desk_name: &str) -> Result<PathBuf, String> {
    let docs_dir = app.path().document_dir().map_err(|e| e.to_string())?;
    Ok(docs_dir.join("Balise").join(desk_name))
}

/// A desk's SQLite file. plugin-sql resolves `sqlite:{desk}.db` against
/// app_config_dir; match it exactly so we open the same file (NOT app_data_dir,
/// which only coincides on Windows).
pub(crate) fn resolve_desk_db_path(
    app: &tauri::AppHandle,
    desk_name: &str,
) -> Result<PathBuf, String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(config_dir.join(format!("{desk_name}.db")))
}
