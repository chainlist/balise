import { invoke } from '@tauri-apps/api/core';
import { syncServerUrl } from '$lib/config/sync';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { devicesService } from '$lib/services/sync/devices.svelte';
import { syncService } from '$lib/services/sync/sync';
import { startSync } from '$lib/utils/sync';
import type { SignalMessage } from '$lib/services/sync/signal';

/** Reconnect backoff bounds for a dropped control-plane connection. */
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Keeps a persistent WebSocket to the balise-sync control plane open while sync
 * is enabled and at least one device is paired. It proves this device's identity
 * by signing the server's challenge, then drives the wake handshake: it asks the
 * server to wake this device's online peers ({@link requestSync}), brings up iroh
 * and signals `ready` when a peer wakes us, and forwards each `peer-ready` reply
 * to subscribers so the dialer reaches a peer the moment its endpoint is up.
 */
class SyncConnectionService {
	#socket: WebSocket | null = null;
	#reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	#reconnectDelay = RECONNECT_MIN_MS;
	/** Whether the gate currently wants a connection; guards reconnect attempts. */
	#wanted = false;
	/** True once the server accepts our auth (`hello`); gates signaling sends. */
	#authed = false;
	/** Subscribers notified each time a woken peer reports its endpoint is up. */
	#peerReadyHandlers = new Set<(peerKey: string) => void>();
	/** Subscribers notified when a paired peer asks us to sync (a `wake`). */
	#wakeHandlers = new Set<(initiatorKey: string) => void>();

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
	 * sent, `false` if we're not connected/authenticated. Each woken peer replies
	 * with a `peer-ready` once its endpoint is up, delivered to {@link onPeerReady}.
	 */
	async requestSync(): Promise<boolean> {
		const socket = this.#socket;
		if (!this.#authed || socket?.readyState !== WebSocket.OPEN) return false;
		await startSync();
		socket.send(JSON.stringify({ type: 'sync-request' }));
		return true;
	}

	/** Subscribes to `peer-ready` notifications. Returns an unsubscribe function. */
	onPeerReady(handler: (peerKey: string) => void): () => void {
		this.#peerReadyHandlers.add(handler);
		return () => this.#peerReadyHandlers.delete(handler);
	}

	/** Subscribes to `wake` notifications. Returns an unsubscribe function. */
	onWake(handler: (initiatorKey: string) => void): () => void {
		this.#wakeHandlers.add(handler);
		return () => this.#wakeHandlers.delete(handler);
	}

	/** Tells a peer our iroh endpoint is up so it dials us. No-op if not connected. */
	sendReady(toKey: string): void {
		if (this.#authed && this.#socket?.readyState === WebSocket.OPEN) {
			this.#socket.send(JSON.stringify({ type: 'ready', to: toKey }));
		}
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
				// A paired peer wants to sync. The orchestrator brings up our endpoint
				// and decides who dials (see DeviceSyncService). The server only wakes
				// paired peers and the accept loop gates the exchange, so this is safe.
				for (const handler of this.#wakeHandlers) handler(message.from);
				break;
			case 'peer-ready':
				for (const handler of this.#peerReadyHandlers) handler(message.from);
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
