import { invoke } from '@tauri-apps/api/core';
import { load, type Store } from '@tauri-apps/plugin-store';
import { resolveStorePath } from './store-path';
import { syncServerUrl } from '$lib/config/sync';

/** A paired peer as returned by the server. */
export interface Peer {
	/** The server's id for the device (used for its own bookkeeping). */
	deviceId: string;
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
 * Talks to the balise-sync control-plane server for device pairing. Every
 * authenticated endpoint requires a fresh signed challenge, so all calls go
 * through {@link SyncService.authedFetch}, which fetches a nonce, signs it with
 * this device's key, and attaches the auth headers before issuing the request.
 */
class SyncService {
	#store: Store | null = null;
	/** Server-assigned id for this device, cached after registration. */
	#deviceId: string | null = null;

	async init(): Promise<void> {
		this.#store = await load(await resolveStorePath('sync.json'), { autoSave: 100 });
		this.#deviceId = (await this.#store.get<string>('deviceId')) ?? null;
	}

	/**
	 * Registers this device with the server, proving ownership of its key, and
	 * caches the assigned id. Idempotent: the server returns the same id for a
	 * known key, so this is cheap to call before any authenticated request.
	 */
	async register(): Promise<string> {
		if (this.#deviceId) return this.#deviceId;
		const publicKey = await invoke<string>('public_key_hex');
		const res = await this.#authedFetch(
			'/devices',
			{ method: 'POST' },
			{ 'X-Public-Key': publicKey }
		);
		if (!res.ok) throw new Error(`registration failed (${res.status})`);
		const { deviceId } = (await res.json()) as { deviceId: string };
		this.#deviceId = deviceId;
		void this.#store?.set('deviceId', deviceId);
		return deviceId;
	}

	/** Mints a short-lived, single-use pairing code for another device to claim. */
	async createPairingCode(): Promise<PairingCode> {
		await this.register();
		const res = await this.#authedFetch('/pairing/codes', { method: 'POST' });
		if (!res.ok) throw new Error(`could not create a pairing code (${res.status})`);
		return (await res.json()) as PairingCode;
	}

	/** Redeems a pairing code, pairing this device with the code's owner. */
	async claim(code: string): Promise<Peer> {
		await this.register();
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

	/** Removes the pairing edge with a peer, identified by its server device id. */
	async unpair(peerDeviceId: string): Promise<void> {
		await this.register();
		const res = await this.#authedFetch(`/peers/${encodeURIComponent(peerDeviceId)}`, {
			method: 'DELETE'
		});
		if (!res.ok) throw new Error(`unpair failed (${res.status})`);
	}

	/** Lists this device's paired peers (used to detect a freshly claimed code). */
	async getPeers(): Promise<Peer[]> {
		await this.register();
		const res = await this.#authedFetch('/peers', { method: 'GET' });
		if (!res.ok) throw new Error(`could not load peers (${res.status})`);
		return (await res.json()) as Peer[];
	}

	/**
	 * The challenge/sign/call dance every authenticated endpoint needs: fetch a
	 * one-time nonce, sign it with this device's key, then issue `path` with the
	 * signature attached. `identity` overrides the default `X-Device-Id` header,
	 * e.g. registration sends `X-Public-Key` since it has no id yet.
	 */
	async #authedFetch(
		path: string,
		init: RequestInit = {},
		identity?: Record<string, string>
	): Promise<Response> {
		const nonce = await this.#challenge();
		const signature = await invoke<string>('sign_challenge', { nonce });

		const headers = new Headers(init.headers);
		headers.set('X-Nonce', nonce);
		headers.set('X-Signature', signature);
		if (identity) {
			for (const [key, value] of Object.entries(identity)) headers.set(key, value);
		} else {
			headers.set('X-Device-Id', this.#deviceId!);
		}

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
