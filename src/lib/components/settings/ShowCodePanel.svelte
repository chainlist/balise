<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Loader2Icon } from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import DeviceFields from './DeviceFields.svelte';
	import {
		devicesService,
		type LinkedDevice,
		type DeviceType
	} from '$lib/services/sync/devices.svelte';
	import { deviceSyncService } from '$lib/services/sync/device-sync.svelte';
	import { syncService } from '$lib/services/sync/sync';
	import { deviceIdFromPublicKey } from '$lib/utils/device-id';
	import { toasterService, errorMessage } from '$lib/core/services/toaster';
	import * as m from '$paraglide/messages.js';

	let { onpaired }: { onpaired: () => void } = $props();

	/** How often to poll the server for a device that claimed the code. */
	const POLL_MS = 2500;

	let code = $state<string | null>(null);
	let expiresAt = $state(0);
	let expired = $state(false);
	let generating = $state(false);
	let error = $state<string | null>(null);

	/** Set once a peer claims the code, switching the panel to the naming step. */
	let paired = $state<LinkedDevice | null>(null);
	let name = $state('');
	let type = $state<DeviceType>('desktop');

	/** Peer public keys already paired before this code, to spot the new one. */
	let baseline = new Set<string>();
	let poll: ReturnType<typeof setInterval> | null = null;

	function stopPolling() {
		if (poll) {
			clearInterval(poll);
			poll = null;
		}
	}

	onDestroy(stopPolling);

	async function checkForPairing() {
		if (Date.now() >= expiresAt) {
			stopPolling();
			expired = true;
			return;
		}
		try {
			const peers = await syncService.getPeers();
			const fresh = peers.filter((p) => !baseline.has(p.publicKey));
			if (fresh.length === 0) return;

			stopPolling();
			let firstPaired: LinkedDevice | null = null;
			for (const peer of fresh) {
				const id = await deviceIdFromPublicKey(peer.publicKey);
				const device: LinkedDevice = {
					id,
					publicKey: peer.publicKey,
					name: '',
					type: 'desktop',
					lastSeen: Date.now()
				};
				// Persist immediately so the pairing isn't lost if the dialog closes
				// before the user names it.
				devicesService.upsert(device);
				firstPaired ??= device;
			}
			// Sync right away with the device we just paired.
			void deviceSyncService.syncAll();
			// Hold on a naming step so the new device can be named here.
			paired = firstPaired;
		} catch {
			// Transient poll failures are expected; keep trying until expiry.
		}
	}

	function save() {
		if (!paired) return;
		const trimmed = name.trim();
		if (!trimmed) return;
		devicesService.upsert({ ...paired, name: trimmed, type });
		toasterService.success(m.settings_sync_add_accepted());
		onpaired();
	}

	async function generate() {
		error = null;
		expired = false;
		generating = true;
		try {
			const peers = await syncService.getPeers();
			baseline = new Set(peers.map((p) => p.publicKey));
			const pairing = await syncService.createPairingCode();
			code = pairing.code;
			expiresAt = pairing.expiresAt;
			stopPolling();
			poll = setInterval(() => void checkForPairing(), POLL_MS);
		} catch (e) {
			error = errorMessage(e);
			toasterService.error(m.settings_sync_code_create_error(), errorMessage(e));
		} finally {
			generating = false;
		}
	}
</script>

<div class="flex flex-col items-center gap-5 py-2">
	{#if paired}
		<form
			class="flex w-full flex-col gap-4"
			onsubmit={(event) => {
				event.preventDefault();
				save();
			}}
		>
			<p class="text-center text-sm text-muted-foreground">
				{m.settings_sync_show_name_prompt()}
			</p>
			<DeviceFields bind:name bind:type />
			<div class="flex justify-end">
				<Button type="submit" disabled={!name.trim()}>{m.settings_sync_show_save()}</Button>
			</div>
		</form>
	{:else if code}
		<div class="flex flex-col items-center gap-2">
			<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
				{m.settings_sync_code_label()}
			</p>
			<p class="font-mono text-3xl font-bold tracking-[0.3em]">{code}</p>
		</div>

		{#if expired}
			<p class="text-sm text-destructive">{m.settings_sync_show_expired()}</p>
			<Button variant="outline" onclick={generate} disabled={generating}>
				{m.settings_sync_show_new()}
			</Button>
		{:else}
			<p class="max-w-xs text-center text-sm text-muted-foreground">
				{m.settings_sync_show_instructions()}
			</p>
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2Icon size="15" class="animate-spin" />
				{m.settings_sync_show_waiting()}
			</div>
		{/if}
	{:else}
		<p class="max-w-xs text-center text-sm text-muted-foreground">
			{m.settings_sync_show_instructions()}
		</p>
		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
		<Button onclick={generate} disabled={generating}>
			{generating ? m.settings_sync_pairing_pending() : m.settings_sync_show_generate()}
		</Button>
	{/if}
</div>
