import { invoke } from '@tauri-apps/api/core';
import { syncServerUrl } from '$lib/config/sync';

/** A paired peer as returned by the server, identified by its public key. */
export interface Peer {
	/** Raw Ed25519 public key, hex-encoded. Convert to a Base32 id to dial it. */
	publicKey: string;
}

/** A freshly minted pairing code and when it stops being valid. */
export interface PairingCode {
	code: string;
	/** Epoch milliseconds at which the code expires. */
	expiresAt: number;
}

/** Reasons the server rejects a claimed code, mirrored from its error codes. */
export type ClaimErrorCode = 'invalid_code' | 'expired_code' | 'used_code' | 'self_pair';

/** Thrown when a pairing code is rejected, carrying the server's reason. */
export class ClaimError extends Error {
	constructor(
		readonly code: ClaimErrorCode,
		message: string
	) {
		super(message);
		this.name = 'ClaimError';
	}
}

/**
 * Talks to the balise-sync control-plane server for device pairing. This device
 * is identified solely by its Ed25519 public key: every authenticated endpoint
 * requires a fresh signed challenge, so all calls go through
 * {@link SyncService.authedFetch}, which fetches a nonce, signs it with this
 * device's key, and presents the key for verification. There is no server-minted
 * id to cache, so a server reset or redeploy self-heals on the next request.
 */
class SyncService {
	/** This device's public key, hex-encoded. Loaded once from the backend. */
	#publicKey: string | null = null;

	async init(): Promise<void> {
		this.#publicKey = await invoke<string>('public_key_hex');
	}

	/** This device's hex public key — its identity to the sync server. */
	async publicKey(): Promise<string> {
		if (!this.#publicKey) this.#publicKey = await invoke<string>('public_key_hex');
		return this.#publicKey;
	}

	/** Mints a short-lived, single-use pairing code for another device to claim. */
	async createPairingCode(): Promise<PairingCode> {
		const res = await this.#authedFetch('/pairing/codes', { method: 'POST' });
		if (!res.ok) throw new Error(`could not create a pairing code (${res.status})`);
		return (await res.json()) as PairingCode;
	}

	/** Redeems a pairing code, pairing this device with the code's owner. */
	async claim(code: string): Promise<Peer> {
		const res = await this.#authedFetch('/pairing/claim', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code })
		});
		if (res.status === 409) {
			const { error, message } = (await res.json()) as { error: ClaimErrorCode; message: string };
			throw new ClaimError(error, message);
		}
		if (!res.ok) throw new Error(`pairing failed (${res.status})`);
		const { peer } = (await res.json()) as { peer: Peer };
		return peer;
	}

	/** Removes the pairing edge with a peer, identified by its hex public key. */
	async unpair(peerPublicKey: string): Promise<void> {
		const res = await this.#authedFetch(`/peers/${encodeURIComponent(peerPublicKey)}`, {
			method: 'DELETE'
		});
		if (!res.ok) throw new Error(`unpair failed (${res.status})`);
	}

	/** Lists this device's paired peers (used to detect a freshly claimed code). */
	async getPeers(): Promise<Peer[]> {
		const res = await this.#authedFetch('/peers', { method: 'GET' });
		if (!res.ok) throw new Error(`could not load peers (${res.status})`);
		return (await res.json()) as Peer[];
	}

	/**
	 * The challenge/sign/call dance every authenticated endpoint needs: fetch a
	 * one-time nonce, sign it with this device's key, then issue `path` with the
	 * signature and this device's public key attached. The server verifies the
	 * signature against the presented key, so identity needs no prior lookup.
	 */
	async #authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
		const nonce = await this.#challenge();
		const signature = await invoke<string>('sign_challenge', { nonce });

		const headers = new Headers(init.headers);
		headers.set('X-Nonce', nonce);
		headers.set('X-Signature', signature);
		headers.set('X-Public-Key', await this.publicKey());

		return fetch(`${syncServerUrl()}${path}`, { ...init, headers });
	}

	/** Fetches a one-time challenge nonce to sign. */
	async #challenge(): Promise<string> {
		const res = await fetch(`${syncServerUrl()}/auth/challenge`, { method: 'POST' });
		if (!res.ok) throw new Error(`challenge failed (${res.status})`);
		const { nonce } = (await res.json()) as { nonce: string };
		return nonce;
	}
}

export const syncService = new SyncService();
