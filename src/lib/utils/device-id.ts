import { invoke } from '@tauri-apps/api/core';

/** This device's identity: the Base32-encoded Ed25519 public key. */
export function getDeviceId(): Promise<string> {
	return invoke<string>('device_id');
}

/** Splits a raw id into groups of 4 characters for readable display. */
export function deviceIdGroups(id: string): string[] {
	return id.match(/.{1,4}/g) ?? [];
}

/** Formats a raw id into hyphen-separated groups of 4 for display. */
export function formatDeviceId(id: string): string {
	return id.replace(/(.{4})(?=.)/g, '$1-');
}
