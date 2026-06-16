<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Loader2Icon } from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { devicesService } from '$lib/services/sync/devices.svelte';
	import { syncService } from '$lib/services/sync/sync';
	import { deviceIdFromPublicKey } from '$lib/utils/device-id';
	import { toasterService, errorMessage } from '$lib/services/app/toaster';
	import * as m from '$paraglide/messages.js';

	let { onpaired }: { onpaired: () => void } = $props();

	/** How often to poll the server for a device that claimed the code. */
	const POLL_MS = 2500;

	let code = $state<string | null>(null);
	let expiresAt = $state(0);
	let expired = $state(false);
	let generating = $state(false);
	let error = $state<string | null>(null);

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
			for (const peer of fresh) {
				const id = await deviceIdFromPublicKey(peer.publicKey);
				devicesService.upsert({
					id,
					publicKey: peer.publicKey,
					name: '',
					type: 'desktop',
					lastSeen: Date.now()
				});
			}
			toasterService.success(m.settings_sync_add_accepted());
			onpaired();
		} catch {
			// Transient poll failures are expected; keep trying until expiry.
		}
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
	{#if code}
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
