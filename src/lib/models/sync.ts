/** One row in a peer's device-sync manifest. `updatedAt` is the LWW clock. */
export interface ManifestEntry {
	id: string;
	/** SQLite or ISO timestamp form - compare via parseDbTimestamp, never as a string. */
	updatedAt: string;
	/** True when this entry is a tombstone (the note was deleted). */
	deleted: boolean;
}

/** A full note body transferred after manifests are compared. */
export interface SyncedNote {
	id: string;
	content: string;
	pinned: boolean;
	archived: boolean;
	createdAt: string;
	updatedAt: string;
	/** When true the peer should delete this note; the other fields are unused. */
	deleted: boolean;
}

/** Messages exchanged over the sync stream: manifest first, then the bodies. */
export type SyncMessage =
	| { type: 'manifest'; entries: ManifestEntry[] }
	| { type: 'notes'; notes: SyncedNote[] };

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
	| { type: 'hello'; deviceId: string }
	| { type: 'wake'; from: string; node: NodeAddr }
	| { type: 'peer-ready'; from: string; node: NodeAddr }
	| { type: 'sync-targets'; online: string[]; offline: string[] }
	| { type: 'error'; message: string };
