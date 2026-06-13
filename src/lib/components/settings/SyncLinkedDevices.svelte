<script lang="ts">
	import {
		MonitorIcon,
		LaptopIcon,
		SmartphoneIcon,
		TabletIcon,
		MonitorSmartphoneIcon
	} from '@lucide/svelte';
	import { settingsService } from '$lib/services/settings.svelte';
	import { devicesService } from '$lib/services/devices.svelte';
	import { formatDeviceId } from '$lib/utils/device-id';
	import * as m from '$paraglide/messages.js';

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
			<div class="flex items-center gap-3 rounded-lg border px-3 py-2.5">
				<Icon size="20" class="shrink-0 text-muted-foreground" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium">{device.name}</p>
					<p class="truncate font-mono text-xs text-muted-foreground">
						{formatDeviceId(device.id)}
					</p>
				</div>
				<p class="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
					{relativeLabel(device.lastSeen, settingsService.general.language)}
				</p>
			</div>
		{/each}
	</div>
{/if}
