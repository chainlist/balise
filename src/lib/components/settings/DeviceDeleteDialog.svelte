<script lang="ts">
	import { devicesService, type LinkedDevice } from '$lib/services/sync/devices.svelte';
	import { syncService } from '$lib/services/sync/sync';
	import { toasterService, errorMessage } from '$lib/services/app/toaster';
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as m from '$paraglide/messages.js';

	let { device = $bindable() }: { device: LinkedDevice | null } = $props();

	async function confirmDelete() {
		const target = device;
		if (!target) return;
		device = null;
		// Best-effort unpair on the server; the device is always removed locally.
		try {
			if (target.publicKey) await syncService.unpair(target.publicKey);
		} catch (e) {
			toasterService.warning(m.settings_sync_unpair_warning(), errorMessage(e));
		}
		devicesService.remove(target.id);
	}
</script>

<Dialog.Root open={device !== null} onOpenChange={(next) => (device = next ? device : null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.settings_sync_delete_title()}</Dialog.Title>
			<Dialog.Description>{m.settings_sync_delete_description()}</Dialog.Description>
		</Dialog.Header>
		<div class="flex justify-end gap-2 p-6">
			<Button type="button" variant="outline" onclick={() => (device = null)}>
				{m.action_cancel()}
			</Button>
			<Button type="button" variant="destructive" onclick={confirmDelete}>
				{m.action_delete()}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
