import { invoke } from '@tauri-apps/api/core';
import { SYNC_SERVER_URL } from '$lib/config/sync';
import { settingsService } from '$lib/services/settings.svelte';
import { devicesService } from '$lib/services/devices.svelte';
import { syncService } from '$lib/services/sync';
import type { SignalMessage } from '$lib/models/sync';

/** Reconnect backoff bounds for a dropped control-plane connection. */
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Keeps a persistent WebSocket to the balise-sync control plane open while sync
 * is enabled and at least one device is paired. It proves this device's identity
 * by signing the server's challenge, then stays connected to receive wake
 * signals. Acting on those signals (bringing up iroh and dialing back) isn't
 * wired yet; for now the connection simply listens.
 */
class SyncConnectionService {
	#socket: WebSocket | null = null;
	#reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	#reconnectDelay = RECONNECT_MIN_MS;
	/** Whether the gate currently wants a connection; guards reconnect attempts. */
	#wanted = false;

	/**
	 * Reactively open or close the connection as the sync toggle and the paired
	 * device list change. Call once after settings, devices and sync are inited.
	 */
	start(): void {
		$effect.root(() => {
			$effect(() => {
				const shouldConnect = settingsService.sync.enabled && devicesService.linked.length > 0;
				if (shouldConnect) this.#connect();
				else this.#disconnect();
			});
		});
	}

	#wsUrl(): string {
		return `${SYNC_SERVER_URL.replace(/^http/, 'ws')}/sync`;
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
				// Authenticated: reset backoff so the next drop reconnects promptly.
				this.#reconnectDelay = RECONNECT_MIN_MS;
				break;
			case 'wake':
			case 'peer-ready':
			case 'sync-targets':
			case 'error':
				// Reacting to control signals isn't wired up yet; observe for now.
				console.debug('sync control message:', message);
				break;
		}
	}

	/** Sign the server's nonce with this device's key and send the auth message. */
	async #authenticate(socket: WebSocket, nonce: string): Promise<void> {
		try {
			const deviceId = await syncService.register();
			const signature = await invoke<string>('sign_challenge', { nonce });
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ type: 'auth', deviceId, signature }));
			}
		} catch (e) {
			console.warn('sync control auth failed:', e);
			socket.close();
		}
	}

	#onClose(socket: WebSocket): void {
		if (this.#socket !== socket) return; // a stale socket we already replaced
		this.#socket = null;
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
