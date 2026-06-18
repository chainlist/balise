import { devicesService } from './devices.svelte';
import { pairingService } from './pairing';
import { syncOrchestrator } from './sync-orchestrator.svelte';
import { signalingService } from './signaling.svelte';

/**
 * Single entry point for the peer-to-peer device-sync feature. It owns the
 * feature's singletons (identity, paired-device cache, dial orchestrator,
 * control-plane connection) so the rest of the app only ever touches one symbol:
 * `initApp` calls {@link SyncFeature.init} and the settings UI reads
 * {@link SyncFeature.available}. Everything else flows through `noteSignals`, so
 * the feature is unplugged by flipping {@link available} to false (or deleting
 * this module's call in `initApp`) without any other code needing to change.
 */
class SyncFeature {
	/** Whether the device-sync feature is wired in. Flip to false to unplug the
	 *  whole feature: {@link init} becomes a no-op and the settings section is
	 *  filtered out, leaving the file mirror and the rest of the app untouched. */
	readonly available = true;

	/**
	 * Boots the feature, in the order `initApp` used before this facade existed:
	 * register the dial orchestrator's listeners, load the paired-device cache,
	 * load this device's identity, then open the control-plane connection. A no-op
	 * when {@link available} is false.
	 */
	async init(): Promise<void> {
		if (!this.available) return;
		await syncOrchestrator.init();
		await devicesService.init();
		await pairingService.init();
		signalingService.start();
	}
}

export const syncFeature = new SyncFeature();
