import { listen } from '@tauri-apps/api/event';
import { devicesService } from './devices.svelte';
import { respondPairing, type PairingRequest } from '$lib/utils/pairing';

/**
 * Listens for incoming pairing requests from the backend and drives the
 * "A device wants to sync with you" popup. Requests are queued and shown one at
 * a time; accepting adds the peer (by id, unlabeled) to the linked-devices list.
 */
class PairingService {
	/** Pending incoming requests; the first is the one currently shown. */
	queue = $state<PairingRequest[]>([]);

	current = $derived(this.queue[0] ?? null);

	init(): void {
		void listen<PairingRequest>('pairing-request', (event) => {
			this.queue = [...this.queue, event.payload];
		});
	}

	async respond(accept: boolean): Promise<void> {
		const request = this.current;
		if (!request) return;

		this.queue = this.queue.slice(1);
		await respondPairing(request.requestId, accept);
		if (accept) {
			devicesService.upsert({
				id: request.deviceId,
				name: '',
				type: 'desktop',
				lastSeen: Date.now()
			});
		}
	}
}

export const pairingService = new PairingService();
