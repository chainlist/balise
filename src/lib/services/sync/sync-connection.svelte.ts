import { invoke } from '@tauri-apps/api/core';
import { syncServerUrl } from '$lib/config/sync';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { devicesService } from '$lib/services/sync/devices.svelte';
import { syncService } from '$lib/services/sync/sync';
import { startSync } from '$lib/utils/sync';
import type { SignalMessage } from '$lib/models/sync';

/** The server's reply to a `sync-request`: which paired peers are reachable. */
export interface SyncTargets {
	online: string[];
	offline: string[];
}

/** Reconnect backoff bounds for a dropped control-plane connection. */
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Keeps a persistent WebSocket to the balise-sync control plane open while sync
 * is enabled and at least one device is paired. It proves this device's identity
 * by signing the server's challenge, then drives the wake handshake: it asks the
 * server to wake this device's online peers ({@link requestSync}), brings up iroh
 * when a peer wakes us, and forwards the `sync-targets` reply to subscribers so
 * the dialer can reach the peers that are online.
 */
class SyncConnectionService {
	#socket: WebSocket | null = null;
	#reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	#reconnectDelay = RECONNECT_MIN_MS;
	/** Whether the gate currently wants a connection; guards reconnect attempts. */
	#wanted = false;
	/** True once the server accepts our auth (`hello`); gates signaling sends. */
	#authed = false;
	/** Subscribers notified of each `sync-targets` reply to our `sync-request`. */
	#syncTargetsHandlers = new Set<(targets: SyncTargets) => void>();

	/**
	 * Reactively open or close the connection as the sync toggle and the paired
	 * device list change. Call once after settings, devices and sync are inited.
	 */
	start(): void {
		$effect.root(() => {
			$effect(() => {
				const shouldConnect =
					settingsService.sync.state.enabled && devicesService.linked.length > 0;
				if (shouldConnect) this.#connect();
				else this.#disconnect();
			});
		});
	}

	/**
	 * Asks the control plane to wake this device's online peers, after bringing up
	 * our own iroh endpoint so we can dial them. Resolves `true` if the request was
	 * sent, `false` if we're not connected/authenticated. The `sync-targets` reply
	 * arrives asynchronously and is delivered to {@link onSyncTargets} subscribers.
	 */
	async requestSync(): Promise<boolean> {
		const socket = this.#socket;
		if (!this.#authed || socket?.readyState !== WebSocket.OPEN) return false;
		await startSync();
		socket.send(JSON.stringify({ type: 'sync-request' }));
		return true;
	}

	/** Subscribes to `sync-targets` replies. Returns an unsubscribe function. */
	onSyncTargets(handler: (targets: SyncTargets) => void): () => void {
		this.#syncTargetsHandlers.add(handler);
		return () => this.#syncTargetsHandlers.delete(handler);
	}

	#wsUrl(): string {
		return `${syncServerUrl().replace(/^http/, 'ws')}/sync`;
	}

	#connect(): void {
		this.#wanted = true;
		this.#clearReconnect();
		if (this.#socket) return; // already connecting or connected

		const socket = new WebSocket(this.#wsUrl());
		this.#socket = socket;
		socket.onmessage = (event) => void this.#onMessage(socket, event);
		socket.onclose = () => this.#onClose(socket);
	}

	#disconnect(): void {
		this.#wanted = false;
		this.#authed = false;
		this.#clearReconnect();
		this.#reconnectDelay = RECONNECT_MIN_MS;
		const socket = this.#socket;
		this.#socket = null;
		socket?.close();
	}

	async #onMessage(socket: WebSocket, event: MessageEvent): Promise<void> {
		let message: SignalMessage;
		try {
			message = JSON.parse(event.data as string) as SignalMessage;
		} catch {
			return;
		}

		switch (message.type) {
			case 'challenge':
				await this.#authenticate(socket, message.nonce);
				break;
			case 'hello':
				// Authenticated: reset backoff so the next drop reconnects promptly,
				// then sync once now that we can signal (covers app start / reconnect).
				this.#authed = true;
				this.#reconnectDelay = RECONNECT_MIN_MS;
				void this.requestSync().catch((e) => console.warn('sync on connect failed:', e));
				break;
			case 'wake':
				// A paired peer wants to sync: bring up our iroh endpoint so it can
				// dial us. The server only wakes paired peers and the accept loop gates
				// the actual exchange, so this is safe to act on without a reply.
				void startSync().catch((e) => console.warn('sync wake failed:', e));
				break;
			case 'sync-targets':
				for (const handler of this.#syncTargetsHandlers) {
					handler({ online: message.online, offline: message.offline });
				}
				break;
			case 'error':
				console.warn('sync control error:', message.message);
				break;
		}
	}

	/** Sign the server's nonce with this device's key and send the auth message. */
	async #authenticate(socket: WebSocket, nonce: string): Promise<void> {
		try {
			const publicKey = await syncService.publicKey();
			const signature = await invoke<string>('sign_challenge', { nonce });
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ type: 'auth', publicKey, signature }));
			}
		} catch (e) {
			console.warn('sync control auth failed:', e);
			socket.close();
		}
	}

	#onClose(socket: WebSocket): void {
		if (this.#socket !== socket) return; // a stale socket we already replaced
		this.#socket = null;
		this.#authed = false;
		if (this.#wanted) this.#scheduleReconnect();
	}

	#scheduleReconnect(): void {
		if (this.#reconnectTimer) return;
		const delay = this.#reconnectDelay;
		this.#reconnectDelay = Math.min(this.#reconnectDelay * 2, RECONNECT_MAX_MS);
		this.#reconnectTimer = setTimeout(() => {
			this.#reconnectTimer = null;
			if (this.#wanted) this.#connect();
		}, delay);
	}

	#clearReconnect(): void {
		if (this.#reconnectTimer) {
			clearTimeout(this.#reconnectTimer);
			this.#reconnectTimer = null;
		}
	}
}

export const syncConnectionService = new SyncConnectionService();
