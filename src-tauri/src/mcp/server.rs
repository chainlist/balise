//! The MCP handler and its read-only tools. Each tool resolves the requested
//! desk's SQLite DB through the existing data layer (`crate::sync::list_desks` /
//! `ensure_desk_db`) and runs a single query; nothing here writes.

use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::*;
use rmcp::{schemars, tool, tool_handler, tool_router, ErrorData as McpError, ServerHandler};
use sqlx::{Row, SqliteConnection};
use tauri::AppHandle;

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct DeskParams {
    /// Name of the desk (workspace) to read from.
    pub desk: String,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct SearchParams {
    /// Name of the desk to search within.
    pub desk: String,
    /// Text to full-text search against note content (prefix match per word).
    pub query: String,
    /// Optional tag to further filter results (exact tag name).
    pub tag: Option<String>,
    /// Maximum number of results to return (default 50, max 200).
    pub limit: Option<i64>,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct ReadNoteParams {
    /// Name of the desk the note lives in.
    pub desk: String,
    /// The note's id.
    pub id: String,
}

#[derive(Clone)]
pub struct BaliseMcp {
    app: AppHandle,
    tool_router: ToolRouter<BaliseMcp>,
}

#[tool_router]
impl BaliseMcp {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            tool_router: Self::tool_router(),
        }
    }

    /// Opens a desk's DB for reading, after confirming the desk exists. The
    /// existence check keeps tools read-only: `ensure_desk_db` would otherwise
    /// create an empty desk for an unknown name.
    async fn open_desk(&self, desk: &str) -> Result<SqliteConnection, McpError> {
        if !crate::sync::list_desks(&self.app).iter().any(|d| d == desk) {
            return Err(McpError::invalid_params(
                format!("unknown desk: {desk}"),
                None,
            ));
        }
        crate::sync::ensure_desk_db(&self.app, desk)
            .await
            .map_err(|e| McpError::internal_error(e, None))
    }

    #[tool(description = "List the available desks (note workspaces).")]
    async fn list_desks(&self) -> Result<CallToolResult, McpError> {
        let desks = crate::sync::list_desks(&self.app);
        json_result(&desks)
    }

    #[tool(description = "List every distinct tag used in a desk.")]
    async fn list_tags(
        &self,
        Parameters(p): Parameters<DeskParams>,
    ) -> Result<CallToolResult, McpError> {
        let mut conn = self.open_desk(&p.desk).await?;
        let rows = sqlx::query("SELECT DISTINCT tag FROM note_tags ORDER BY tag")
            .fetch_all(&mut conn)
            .await
            .map_err(query_err)?;
        let tags: Vec<String> = rows
            .iter()
            .map(|r| r.try_get::<String, _>("tag").unwrap_or_default())
            .collect();
        json_result(&tags)
    }

    #[tool(
        description = "Full-text search a desk's notes (FTS5 prefix match on content), optionally filtered by tag. Results are ranked by relevance. Returns id, title, preview and updatedAt for each match."
    )]
    async fn search_notes(
        &self,
        Parameters(p): Parameters<SearchParams>,
    ) -> Result<CallToolResult, McpError> {
        let fts = to_fts_query(&p.query);
        if fts.is_empty() {
            return json_result(&Vec::<serde_json::Value>::new());
        }
        let limit = p.limit.unwrap_or(50).clamp(1, 200);
        let mut conn = self.open_desk(&p.desk).await?;

        let rows = match &p.tag {
            Some(tag) => sqlx::query(
                "SELECT n.id, n.title, n.preview, n.updated_at \
                 FROM search_index \
                 JOIN notes n ON n.id = search_index.id \
                 WHERE search_index MATCH ? AND search_index.type = 'note' \
                   AND n.id IN (SELECT note_id FROM note_tags WHERE tag = ?) \
                 ORDER BY rank LIMIT ?",
            )
            .bind(&fts)
            .bind(tag)
            .bind(limit)
            .fetch_all(&mut conn)
            .await,
            None => sqlx::query(
                "SELECT n.id, n.title, n.preview, n.updated_at \
                 FROM search_index \
                 JOIN notes n ON n.id = search_index.id \
                 WHERE search_index MATCH ? AND search_index.type = 'note' \
                 ORDER BY rank LIMIT ?",
            )
            .bind(&fts)
            .bind(limit)
            .fetch_all(&mut conn)
            .await,
        }
        .map_err(query_err)?;

        let notes: Vec<serde_json::Value> = rows
            .iter()
            .map(|r| {
                serde_json::json!({
                    "id": r.try_get::<String, _>("id").unwrap_or_default(),
                    "title": r.try_get::<Option<String>, _>("title").unwrap_or_default(),
                    "preview": r.try_get::<Option<String>, _>("preview").unwrap_or_default(),
                    "updatedAt": r.try_get::<String, _>("updated_at").unwrap_or_default(),
                })
            })
            .collect();
        json_result(&notes)
    }

    #[tool(description = "Read a single note's full content and metadata by id.")]
    async fn read_note(
        &self,
        Parameters(p): Parameters<ReadNoteParams>,
    ) -> Result<CallToolResult, McpError> {
        let mut conn = self.open_desk(&p.desk).await?;
        let row = sqlx::query(
            "SELECT id, title, content, created_at, updated_at, pinned, archived \
             FROM notes WHERE id = ?",
        )
        .bind(&p.id)
        .fetch_optional(&mut conn)
        .await
        .map_err(query_err)?;

        let Some(row) = row else {
            return Err(McpError::invalid_params(
                format!("note not found: {}", p.id),
                None,
            ));
        };

        let note = serde_json::json!({
            "id": row.try_get::<String, _>("id").unwrap_or_default(),
            "title": row.try_get::<Option<String>, _>("title").unwrap_or_default(),
            "content": row.try_get::<String, _>("content").unwrap_or_default(),
            "createdAt": row.try_get::<String, _>("created_at").unwrap_or_default(),
            "updatedAt": row.try_get::<String, _>("updated_at").unwrap_or_default(),
            "pinned": row.try_get::<i64, _>("pinned").unwrap_or(0) != 0,
            "archived": row.try_get::<i64, _>("archived").unwrap_or(0) != 0,
        });
        json_result(&note)
    }
}

#[tool_handler]
impl ServerHandler for BaliseMcp {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            capabilities: ServerCapabilities::builder().enable_tools().build(),
            instructions: Some(
                "Read-only access to Balise notes. Tools: list_desks, list_tags, \
                 search_notes, read_note."
                    .to_string(),
            ),
            ..Default::default()
        }
    }
}

/// Serializes `value` to JSON and wraps it as a successful tool result.
fn json_result<T: serde::Serialize>(value: &T) -> Result<CallToolResult, McpError> {
    let json = serde_json::to_string(value).map_err(|e| McpError::internal_error(e.to_string(), None))?;
    Ok(CallToolResult::success(vec![Content::text(json)]))
}

/// Maps a sqlx query error to an MCP internal error.
fn query_err(e: sqlx::Error) -> McpError {
    McpError::internal_error(e.to_string(), None)
}

/// Builds a safe FTS5 prefix query from arbitrary text: each whitespace-separated
/// token is quoted (so punctuation and FTS operators are treated literally) and
/// given a `*` prefix. Empty if the input has no tokens.
fn to_fts_query(raw: &str) -> String {
    raw.split_whitespace()
        .map(|tok| format!("\"{}\"*", tok.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" ")
}
