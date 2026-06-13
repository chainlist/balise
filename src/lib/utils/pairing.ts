import { invoke } from '@tauri-apps/api/core';

/** An incoming pairing request awaiting the user's decision. */
export interface PairingRequest {
	requestId: string;
	deviceId: string;
}

/**
 * Dials a peer by its device id and asks it to pair. Resolves to whether the
 * other end accepted; rejects if sync is off, the id is invalid, or unreachable.
 */
export function pairDevice(deviceId: string): Promise<boolean> {
	return invoke<boolean>('pair_device', { deviceId });
}

/** Delivers the user's accept/reject decision for an incoming request. */
export function respondPairing(requestId: string, accept: boolean): Promise<void> {
	return invoke('respond_pairing', { requestId, accept });
}
