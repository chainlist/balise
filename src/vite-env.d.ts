/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Base URL of the balise-sync server, set per build (dev vs production). */
	readonly VITE_SYNC_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
