import { invoke } from '@tauri-apps/api/core';
import type { MagicTag } from '$lib/services/settings/magic-tags.svelte';

/** Starts the iroh networking layer. Rejects if the endpoint fails to bind. */
export function startSync(): Promise<void> {
	return invoke('start_sync');
}

/** Stops the iroh networking layer. */
export function stopSync(): Promise<void> {
	return invoke('stop_sync');
}

/**
 * Pushes the trust set + share/tag config to the backend. The Rust dialer and the
 * autonomous accept loop both read this snapshot, so it must be refreshed whenever
 * paired devices, unshared desks, or magic tags change.
 */
export function setSyncConfig(config: {
	peers: string[];
	unshared: string[];
	magicTags: MagicTag[];
}): Promise<void> {
	return invoke('set_sync_config', config);
}

/**
 * Dials the given paired peers (Base32 device ids) and reconciles all shared
 * desks with each, entirely in the backend. Called after the wake handshake with
 * the peers the server reported online. Note content never crosses into the
 * webview, so a large sync can't jank the UI. Resolves when the cycle finishes.
 */
export function syncPeers(peerIds: string[]): Promise<void> {
	return invoke('sync_peers', { peerIds });
}
