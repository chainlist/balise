import { load, type Store } from '@tauri-apps/plugin-store';
import { resolveStorePath } from '$lib/core/repositories/backend/store';

export type DeviceType = 'desktop' | 'laptop' | 'mobile' | 'tablet';

export interface LinkedDevice {
	/** Base32 device id (iroh node id), used to dial this peer. */
	id: string;
	/** This peer's hex public key, used to unpair it on the server. Absent for
	 * devices paired before this field existed. */
	publicKey?: string;
	name: string;
	type: DeviceType;
	/** Epoch milliseconds of the last successful sync with this device. */
	lastSeen: number;
}

/**
 * Local cache of the devices linked to this instance, persisted to
 * devices.json next to settings.json.
 */
class DevicesService {
	linked = $state<LinkedDevice[]>([]);

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await load(await resolveStorePath('devices.json'), { autoSave: 100 });
		this.linked = (await this.#store.get<LinkedDevice[]>('linked')) ?? [];
	}

	/** Adds a newly paired device, or refreshes an existing one by id. */
	upsert(device: LinkedDevice): void {
		const others = this.linked.filter((d) => d.id !== device.id);
		this.linked = [...others, device];
		this.#persist();
	}

	/** Renames a linked device. */
	rename(id: string, name: string): void {
		this.linked = this.linked.map((d) => (d.id === id ? { ...d, name } : d));
		this.#persist();
	}

	/** Removes a linked device by id. */
	remove(id: string): void {
		this.linked = this.linked.filter((d) => d.id !== id);
		this.#persist();
	}

	#persist(): void {
		void this.#store?.set('linked', $state.snapshot(this.linked));
	}
}

export const devicesService = new DevicesService();
