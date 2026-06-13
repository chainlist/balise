import { invoke } from '@tauri-apps/api/core';

/** Stable Base32 device identifier (128-bit), computed in the Rust backend. */
export function getDeviceId(): Promise<string> {
	return invoke<string>('device_id');
}

/** Formats a raw id into hyphen-separated groups of 4 for display. */
export function formatDeviceId(id: string): string {
	return id.replace(/(.{4})(?=.)/g, '$1-');
}
