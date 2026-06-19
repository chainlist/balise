import { invoke } from '@tauri-apps/api/core';

/** The local MCP endpoint AI clients connect to. Mirrors `BIND_ADDR` in
 *  `src-tauri/src/mcp/mod.rs`; keep the two in sync. */
export const MCP_URL = 'http://127.0.0.1:4127/mcp';

/** Starts the local MCP server. Rejects if the port can't be bound. */
export function startMcp(): Promise<void> {
	return invoke('start_mcp');
}

/** Stops the local MCP server. */
export function stopMcp(): Promise<void> {
	return invoke('stop_mcp');
}
