<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as Select from '$lib/components/shadcn/select/index.js';
	import { devicesService, type DeviceType } from '$lib/services/devices.svelte';
	import { pairDevice } from '$lib/utils/pairing';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import * as m from '$paraglide/messages.js';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const typeLabels: Record<DeviceType, string> = {
		desktop: m.device_type_desktop(),
		laptop: m.device_type_laptop(),
		mobile: m.device_type_mobile(),
		tablet: m.device_type_tablet()
	};

	let deviceId = $state('');
	let name = $state('');
	let type = $state<DeviceType>('desktop');
	let error = $state<string | null>(null);
	let isPairing = $state(false);

	function reset() {
		deviceId = '';
		name = '';
		type = 'desktop';
		error = null;
		isPairing = false;
	}

	async function handlePair() {
		error = null;
		const id = deviceId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		if (!id) {
			error = m.settings_sync_add_error_empty();
			return;
		}

		isPairing = true;
		try {
			const accepted = await pairDevice(id);
			if (accepted) {
				devicesService.upsert({ id, name: name.trim(), type, lastSeen: Date.now() });
				toasterService.success(m.settings_sync_add_accepted());
				open = false;
				reset();
			} else {
				toasterService.warning(m.settings_sync_add_declined());
			}
		} catch (e) {
			error = errorMessage(e);
			toasterService.error(m.settings_sync_add_error_failed(), errorMessage(e));
		} finally {
			isPairing = false;
		}
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(next) => {
		if (!next) reset();
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.settings_sync_add_title()}</Dialog.Title>
			<Dialog.Description>{m.settings_sync_add_description()}</Dialog.Description>
		</Dialog.Header>

		<form
			class="flex flex-col gap-4 p-6"
			onsubmit={(event) => {
				event.preventDefault();
				handlePair();
			}}
		>
			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium" for="pair-device-id">
					{m.settings_sync_add_id_label()}
				</label>
				<Input
					id="pair-device-id"
					bind:value={deviceId}
					placeholder={m.settings_sync_add_id_placeholder()}
					class="font-mono"
					autofocus
					disabled={isPairing}
				/>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium" for="pair-device-name">
					{m.settings_sync_add_name_label()}
				</label>
				<Input
					id="pair-device-name"
					bind:value={name}
					placeholder={m.settings_sync_add_name_placeholder()}
					disabled={isPairing}
				/>
			</div>

			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium" for="pair-device-type">
					{m.settings_sync_add_type_label()}
				</label>
				<Select.Root
					type="single"
					value={type}
					onValueChange={(v) => {
						if (v) type = v as DeviceType;
					}}
					disabled={isPairing}
				>
					<Select.Trigger id="pair-device-type" class="w-full">{typeLabels[type]}</Select.Trigger>
					<Select.Content>
						{#each Object.entries(typeLabels) as [value, label] (value)}
							<Select.Item {value} {label} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={isPairing}>
					{m.action_cancel()}
				</Button>
				<Button type="submit" disabled={isPairing}>
					{isPairing ? m.settings_sync_add_pending() : m.settings_sync_add_submit()}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
