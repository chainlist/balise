import { invoke } from '@tauri-apps/api/core';

/** This device's identity: the Base32-encoded Ed25519 public key. */
export function getDeviceId(): Promise<string> {
	return invoke<string>('device_id');
}

/**
 * Converts a peer's hex-encoded public key (as the sync server stores it) into
 * the Base32 device id used to dial it over iroh.
 */
export function deviceIdFromPublicKey(publicKeyHex: string): Promise<string> {
	return invoke<string>('device_id_from_public_key', { publicKeyHex });
}

/** Formats a raw id into hyphen-separated groups of 4 for display. */
export function formatDeviceId(id: string): string {
	return id.replace(/(.{4})(?=.)/g, '$1-');
}
