import { invoke } from '@tauri-apps/api/core';
import type { SyncMessage } from '$lib/models/sync';

/** Starts the iroh networking layer. Rejects if the endpoint fails to bind. */
export function startSync(): Promise<void> {
	return invoke('start_sync');
}

/** Stops the iroh networking layer. */
export function stopSync(): Promise<void> {
	return invoke('stop_sync');
}

/** Opens a data-sync stream to a paired peer; resolves to the session id. */
export function syncOpen(deviceId: string): Promise<string> {
	return invoke<string>('sync_open', { deviceId });
}

/** Sends one protocol message on the session's stream. */
export function syncSend(sessionId: string, message: SyncMessage): Promise<void> {
	const data = Array.from(new TextEncoder().encode(JSON.stringify(message)));
	return invoke('sync_send', { sessionId, data });
}

/** Reads the next protocol message from the session's stream. */
export async function syncRecv(sessionId: string): Promise<SyncMessage> {
	const data = await invoke<number[]>('sync_recv', { sessionId });
	return JSON.parse(new TextDecoder().decode(new Uint8Array(data))) as SyncMessage;
}

/** Finishes and forgets the session's stream. */
export function syncClose(sessionId: string): Promise<void> {
	return invoke('sync_close', { sessionId });
}
