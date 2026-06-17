<script lang="ts">
	import { Input } from '$lib/components/shadcn/input/index.js';
	import * as Select from '$lib/components/shadcn/select/index.js';
	import { type DeviceType } from '$lib/services/sync/devices.svelte';
	import * as m from '$paraglide/messages.js';

	let {
		name = $bindable(),
		type = $bindable(),
		disabled = false
	}: { name: string; type: DeviceType; disabled?: boolean } = $props();

	const typeLabels: Record<DeviceType, string> = {
		desktop: m.device_type_desktop(),
		laptop: m.device_type_laptop(),
		mobile: m.device_type_mobile(),
		tablet: m.device_type_tablet()
	};
</script>

<div class="flex flex-col gap-2">
	<label class="text-sm font-medium" for="device-name">{m.settings_sync_add_name_label()}</label>
	<Input
		id="device-name"
		bind:value={name}
		placeholder={m.settings_sync_add_name_placeholder()}
		{disabled}
	/>
</div>

<div class="flex flex-col gap-2">
	<label class="text-sm font-medium" for="device-type">{m.settings_sync_add_type_label()}</label>
	<Select.Root
		type="single"
		value={type}
		onValueChange={(v) => {
			if (v) type = v as DeviceType;
		}}
		{disabled}
	>
		<Select.Trigger id="device-type" class="w-full">{typeLabels[type]}</Select.Trigger>
		<Select.Content>
			{#each Object.entries(typeLabels) as [value, label] (value)}
				<Select.Item {value} {label} />
			{/each}
		</Select.Content>
	</Select.Root>
</div>
