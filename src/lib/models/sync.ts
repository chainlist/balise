// Device-sync wire types (manifest entries, note bodies, the manifest/notes
// messages) live in the Rust backend now - the whole protocol runs there, so the
// note data never crosses into the webview. Only the control-plane signal types
// below are still used on the TS side.

/** An iroh node address as carried by the control-plane server. */
export interface NodeAddr {
	nodeId: string;
	relayUrl?: string;
	directAddresses: string[];
}

/**
 * Messages the balise-sync control plane pushes over the /sync WebSocket.
 * Mirrors the server's ServerMessage contract.
 */
export type SignalMessage =
	| { type: 'challenge'; nonce: string }
	| { type: 'hello' }
	| { type: 'wake'; from: string; node: NodeAddr }
	| { type: 'peer-ready'; from: string; node: NodeAddr }
	| { type: 'sync-targets'; online: string[]; offline: string[] }
	| { type: 'error'; message: string };
