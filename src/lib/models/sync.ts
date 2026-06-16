// Device-sync wire types (manifest entries, note bodies, the manifest/notes
// messages) live in the Rust backend now - the whole protocol runs there, so the
// note data never crosses into the webview. Only the control-plane signal types
// below are still used on the TS side. The control plane carries device
// identities (public keys) only, never network addresses: peers dial each other
// by node id and let iroh's relays/discovery resolve the route.

/**
 * Messages the balise-sync control plane pushes over the /sync WebSocket.
 * Mirrors the server's ServerMessage contract. `from` is always a peer's hex
 * public key.
 */
export type SignalMessage =
	| { type: 'challenge'; nonce: string }
	| { type: 'hello' }
	| { type: 'wake'; from: string }
	| { type: 'sync-targets'; online: string[]; offline: string[] }
	| { type: 'error'; message: string };
