import { settingsService } from '$lib/services/settings/settings.svelte';

/**
 * Default base URL of the balise-sync control-plane server (pairing + wake
 * signaling). Configured at build time via the `VITE_SYNC_URL` env var so
 * local/dev builds and production builds can target different hosts. Falls back
 * to localhost. Used when the user hasn't set their own server in settings.
 */
export const SYNC_SERVER_URL = import.meta.env.VITE_SYNC_URL ?? 'http://localhost:8080';

/**
 * The control-plane server to talk to: the user's custom server from sync
 * settings when set, otherwise the build-time {@link SYNC_SERVER_URL}. Read
 * lazily so a server change in settings takes effect on the next request.
 */
export function syncServerUrl(): string {
	return settingsService.sync.state.syncUrl.trim() || SYNC_SERVER_URL;
}
