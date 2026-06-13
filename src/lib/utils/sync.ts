import { invoke } from '@tauri-apps/api/core';

/** Starts the iroh networking layer. Rejects if the endpoint fails to bind. */
export function startSync(): Promise<void> {
	return invoke('start_sync');
}

/** Stops the iroh networking layer. */
export function stopSync(): Promise<void> {
	return invoke('stop_sync');
}
