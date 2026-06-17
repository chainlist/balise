<script lang="ts">
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import DeviceFields from './DeviceFields.svelte';
	import { devicesService, type DeviceType } from '$lib/services/sync/devices.svelte';
	import { deviceSyncService } from '$lib/services/sync/device-sync.svelte';
	import { syncService, ClaimError } from '$lib/services/sync/sync';
	import { deviceIdFromPublicKey } from '$lib/utils/device-id';
	import { toasterService, errorMessage } from '$lib/services/app/toaster';
	import * as m from '$paraglide/messages.js';

	let { onpaired }: { onpaired: () => void } = $props();

	let code = $state('');
	let name = $state('');
	let type = $state<DeviceType>('desktop');
	let error = $state<string | null>(null);
	let isPairing = $state(false);

	function claimErrorMessage(e: unknown): string {
		if (e instanceof ClaimError) {
			switch (e.code) {
				case 'invalid_code':
					return m.settings_sync_claim_invalid_code();
				case 'expired_code':
					return m.settings_sync_claim_expired_code();
				case 'used_code':
					return m.settings_sync_claim_used_code();
				case 'self_pair':
					return m.settings_sync_claim_self_pair();
			}
		}
		return errorMessage(e);
	}

	async function handlePair() {
		error = null;
		const trimmed = code.trim().toUpperCase();
		if (!trimmed) {
			error = m.settings_sync_code_error_empty();
			return;
		}

		isPairing = true;
		try {
			const peer = await syncService.claim(trimmed);
			const id = await deviceIdFromPublicKey(peer.publicKey);
			devicesService.upsert({
				id,
				publicKey: peer.publicKey,
				name: name.trim(),
				type,
				lastSeen: Date.now()
			});
			// Sync right away with the device we just paired.
			void deviceSyncService.syncAll();
			toasterService.success(m.settings_sync_add_accepted());
			onpaired();
		} catch (e) {
			error = claimErrorMessage(e);
		} finally {
			isPairing = false;
		}
	}
</script>

<form
	class="flex flex-col gap-4"
	onsubmit={(event) => {
		event.preventDefault();
		handlePair();
	}}
>
	<div class="flex flex-col gap-2">
		<label class="text-sm font-medium" for="pair-code">{m.settings_sync_code_label()}</label>
		<Input
			id="pair-code"
			bind:value={code}
			placeholder={m.settings_sync_code_placeholder()}
			class="font-mono tracking-widest uppercase"
			autofocus
			disabled={isPairing}
		/>
		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
	</div>

	<DeviceFields bind:name bind:type disabled={isPairing} />

	<div class="flex justify-end">
		<Button type="submit" disabled={isPairing}>
			{isPairing ? m.settings_sync_pairing_pending() : m.settings_sync_pair_submit()}
		</Button>
	</div>
</form>
