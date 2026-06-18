<script lang="ts">
	import {
		MonitorIcon,
		LaptopIcon,
		SmartphoneIcon,
		TabletIcon,
		MonitorSmartphoneIcon,
		PlusIcon,
		RefreshCwIcon,
		Trash2Icon
	} from '@lucide/svelte';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { devicesService, type LinkedDevice } from '$lib/services/sync/devices.svelte';
	import { syncOrchestrator } from '$lib/services/sync/sync-orchestrator.svelte';
	import { formatDeviceId } from '$lib/utils/device-id';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import AddDeviceDialog from './AddDeviceDialog.svelte';
	import DeviceEditDialog from './DeviceEditDialog.svelte';
	import DeviceDeleteDialog from './DeviceDeleteDialog.svelte';
	import * as m from '$paraglide/messages.js';

	let addOpen = $state(false);
	let editDevice = $state<LinkedDevice | null>(null);
	let deleteDevice = $state<LinkedDevice | null>(null);

	const icons = {
		desktop: MonitorIcon,
		laptop: LaptopIcon,
		mobile: SmartphoneIcon,
		tablet: TabletIcon
	};

	function relativeLabel(lastSeen: number, locale: string): string {
		const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
		const minutesAgo = Math.round((Date.now() - lastSeen) / 60_000);
		if (minutesAgo < 60) return rtf.format(-minutesAgo, 'minute');
		const hours = Math.round(minutesAgo / 60);
		if (hours < 24) return rtf.format(-hours, 'hour');
		return rtf.format(-Math.round(hours / 24), 'day');
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<p class="text-sm font-medium">{m.settings_sync_nav_linked()}</p>
		<div class="flex items-center gap-2">
			<Button
				size="sm"
				variant="outline"
				disabled={devicesService.linked.length === 0 || syncOrchestrator.syncing}
				onclick={() => void syncOrchestrator.syncAll(true)}
			>
				<RefreshCwIcon size="15" class={syncOrchestrator.syncing ? 'animate-spin' : ''} />
				{m.settings_sync_now()}
			</Button>
			<Button size="sm" onclick={() => (addOpen = true)}>
				<PlusIcon size="15" />
				{m.settings_sync_add_device()}
			</Button>
		</div>
	</div>

	{#if devicesService.linked.length === 0}
		<div class="flex flex-col items-center justify-center gap-2 py-12 text-center">
			<MonitorSmartphoneIcon size="32" class="text-muted-foreground/50" />
			<p class="text-sm font-medium">{m.settings_sync_linked_empty_title()}</p>
			<p class="max-w-xs text-xs text-muted-foreground">{m.settings_sync_linked_empty_desc()}</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each devicesService.linked as device (device.id)}
				{@const Icon = icons[device.type]}
				<div class="group flex items-center gap-3 rounded-lg border px-3 py-2.5">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-3 text-left"
						onclick={() => (editDevice = device)}
					>
						<Icon size="20" class="shrink-0 text-muted-foreground" />
						<div class="min-w-0 flex-1">
							{#if device.name}
								<p class="truncate text-sm font-medium">{device.name}</p>
								<p class="truncate font-mono text-xs text-muted-foreground">
									{formatDeviceId(device.id)}
								</p>
							{:else}
								<p class="truncate font-mono text-sm">{formatDeviceId(device.id)}</p>
							{/if}
						</div>
					</button>
					<p class="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
						{relativeLabel(device.lastSeen, settingsService.general.state.language)}
					</p>
					<Button
						size="icon"
						variant="ghost"
						class="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
						onclick={() => (deleteDevice = device)}
					>
						<Trash2Icon size="15" />
					</Button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<AddDeviceDialog bind:open={addOpen} />
<DeviceEditDialog bind:device={editDevice} ondelete={(device) => (deleteDevice = device)} />
<DeviceDeleteDialog bind:device={deleteDevice} />
