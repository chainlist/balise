/**
 * Base URL of the balise-sync control-plane server (pairing + wake signaling).
 * Configured at build time via the `VITE_SYNC_URL` env var so local/dev builds
 * and production builds can target different hosts. Falls back to localhost.
 */
export const SYNC_SERVER_URL = import.meta.env.VITE_SYNC_URL ?? 'http://localhost:8080';
