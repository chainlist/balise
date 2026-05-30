use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::time::SystemTime;
use tauri::Manager;

#[derive(Serialize)]
pub struct DeskFileMeta {
    pub name: String,
    pub id: String,
    pub pinned: bool,
    pub archived: bool,
    pub created_at: String,
    pub updated_at: String,
    pub mtime_ms: u64,
}

#[derive(Serialize)]
pub struct FileContent {
    pub name: String,
    pub content: String,
}

fn read_frontmatter_meta(path: &Path, name: String) -> Option<DeskFileMeta> {
    let mtime_ms = std::fs::metadata(path)
        .ok()?
        .modified()
        .ok()?
        .duration_since(SystemTime::UNIX_EPOCH)
        .ok()?
        .as_millis() as u64;

    let file = std::fs::File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let mut line = String::new();

    reader.read_line(&mut line).ok()?;
    if line.trim_end() != "---" {
        return None;
    }

    let mut id = String::new();
    let mut pinned = false;
    let mut archived = false;
    let mut created_at = String::new();
    let mut updated_at = String::new();
    let mut found_end = false;

    loop {
        line.clear();
        if reader.read_line(&mut line).ok()? == 0 {
            break;
        }
        let trimmed = line.trim_end();
        if trimmed == "---" {
            found_end = true;
            break;
        }
        if let Some(colon) = trimmed.find(':') {
            let key = trimmed[..colon].trim();
            let value = trimmed[colon + 1..].trim();
            match key {
                "id" => id = value.to_string(),
                "pinned" => pinned = value == "true" || value == "1",
                "archived" => archived = value == "true" || value == "1",
                "created_at" => created_at = value.to_string(),
                "updated_at" => updated_at = value.to_string(),
                _ => {}
            }
        }
    }

    if !found_end || id.is_empty() {
        return None;
    }

    Some(DeskFileMeta { name, id, pinned, archived, created_at, updated_at, mtime_ms })
}

#[tauri::command]
pub fn scan_desk_files(
    app: tauri::AppHandle,
    desk_name: String,
) -> Result<Vec<DeskFileMeta>, String> {
    let docs_dir = app.path().document_dir().map_err(|e| e.to_string())?;
    let desk_dir = docs_dir.join("Balise").join(&desk_name);

    let mut files = Vec::new();
    for entry in std::fs::read_dir(&desk_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()).map(str::to_string) else {
            continue;
        };
        if let Some(meta) = read_frontmatter_meta(&path, name) {
            files.push(meta);
        }
    }

    Ok(files)
}

fn strip_frontmatter(raw: &str) -> String {
    if !raw.starts_with("---\n") {
        return raw.to_string();
    }
    let rest = &raw[4..];
    if let Some(end) = rest.find("\n---\n") {
        rest[end + 5..].to_string()
    } else {
        raw.to_string()
    }
}

#[tauri::command]
pub fn read_desk_files_content(
    app: tauri::AppHandle,
    desk_name: String,
    names: Vec<String>,
) -> Result<Vec<FileContent>, String> {
    let docs_dir = app.path().document_dir().map_err(|e| e.to_string())?;
    let desk_dir = docs_dir.join("Balise").join(&desk_name);

    names
        .into_iter()
        .map(|name| {
            let raw = std::fs::read_to_string(desk_dir.join(&name)).map_err(|e| e.to_string())?;
            let content = strip_frontmatter(&raw);
            Ok(FileContent { name, content })
        })
        .collect()
}
