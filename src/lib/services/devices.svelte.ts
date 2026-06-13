import { load, type Store } from '@tauri-apps/plugin-store';
import { resolveStorePath } from './store-path';

export type DeviceType = 'desktop' | 'laptop' | 'mobile' | 'tablet';

export interface LinkedDevice {
	id: string;
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

	#persist(): void {
		void this.#store?.set('linked', $state.snapshot(this.linked));
	}
}

export const devicesService = new DevicesService();
