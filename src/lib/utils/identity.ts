import { invoke } from '@tauri-apps/api/core';

/** This device's hex public key, cached after the first backend load. */
let cachedPublicKey: string | null = null;

/** This device's Ed25519 public key, hex-encoded. Its identity to the sync server. */
export async function getPublicKey(): Promise<string> {
	if (!cachedPublicKey) cachedPublicKey = await invoke<string>('public_key_hex');
	return cachedPublicKey;
}

/** Signs a server challenge nonce with this device's private key. */
export function signChallenge(nonce: string): Promise<string> {
	return invoke<string>('sign_challenge', { nonce });
}
