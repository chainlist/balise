<script lang="ts">
	import { devicesService, type LinkedDevice } from '$lib/services/sync/devices.svelte';
	import { toasterService, errorMessage } from '$lib/core/services/toaster';
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as m from '$paraglide/messages.js';

	let {
		device = $bindable(),
		ondelete
	}: { device: LinkedDevice | null; ondelete: (device: LinkedDevice) => void } = $props();

	let name = $state('');

	$effect(() => {
		if (device) name = device.name;
	});

	function save() {
		if (!device) return;
		try {
			devicesService.rename(device.id, name.trim());
			device = null;
		} catch (e) {
			toasterService.error(m.settings_sync_edit_error_failed(), errorMessage(e));
		}
	}
</script>

<Dialog.Root open={device !== null} onOpenChange={(next) => (device = next ? device : null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.settings_sync_edit_title()}</Dialog.Title>
			<Dialog.Description>{m.settings_sync_edit_description()}</Dialog.Description>
		</Dialog.Header>
		<form
			class="flex flex-col gap-4 p-6"
			onsubmit={(event) => {
				event.preventDefault();
				save();
			}}
		>
			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium" for="device-name">
					{m.settings_sync_add_name_label()}
				</label>
				<Input
					id="device-name"
					bind:value={name}
					placeholder={m.settings_sync_add_name_placeholder()}
					autofocus
				/>
			</div>

			<div class="flex justify-between gap-2">
				<Button
					type="button"
					variant="destructive"
					onclick={() => {
						const target = device;
						if (!target) return;
						device = null;
						ondelete(target);
					}}
				>
					{m.action_delete()}
				</Button>
				<div class="flex gap-2">
					<Button type="button" variant="outline" onclick={() => (device = null)}>
						{m.action_cancel()}
					</Button>
					<Button type="submit">{m.action_save()}</Button>
				</div>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
