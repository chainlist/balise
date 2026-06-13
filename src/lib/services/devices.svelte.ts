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

/* Placeholder devices seeded on first run until the sync backend exists. */
const SEED: { id: string; name: string; type: DeviceType; minutesAgo: number }[] = [
	{ id: 'MFRGGZDFMZTWQ2LKNNWG23TPOB', name: 'MacBook Pro', type: 'laptop', minutesAgo: 2 },
	{ id: 'KRUGS4ZANFZSAYJAORSXG5BPF4', name: 'iPhone 15', type: 'mobile', minutesAgo: 60 },
	{ id: 'NB2HI4DTHIXS653XO5SWY3DPF5', name: 'Office iMac', type: 'desktop', minutesAgo: 1440 },
	{ id: 'ORSXG5BAONUW24DBORSXGYTJNZ', name: 'iPad Air', type: 'tablet', minutesAgo: 4320 },
	{ id: 'PFXGG3DJMQQE2YLOMQQGK4TFP4', name: 'ThinkPad X1', type: 'laptop', minutesAgo: 20160 }
];

function seedDevices(): LinkedDevice[] {
	const now = Date.now();
	return SEED.map(({ minutesAgo, ...rest }) => ({ ...rest, lastSeen: now - minutesAgo * 60_000 }));
}

/**
 * Local cache of the devices linked to this instance, persisted to
 * devices.json next to settings.json. Once the sync backend exists the
 * server/peer is the source of truth and this becomes an offline cache.
 */
class DevicesService {
	linked = $state<LinkedDevice[]>([]);

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await load(await resolveStorePath('devices.json'), { autoSave: 100 });

		const stored = await this.#store.get<LinkedDevice[]>('linked');
		if (stored) {
			this.linked = stored;
		} else {
			this.linked = seedDevices();
			this.#persist();
		}
	}

	#persist(): void {
		void this.#store?.set('linked', $state.snapshot(this.linked));
	}
}

export const devicesService = new DevicesService();
