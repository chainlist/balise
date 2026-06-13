<script lang="ts">
	import { Switch } from 'bits-ui';
	import { SmartphoneIcon, MonitorSmartphoneIcon } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import { settingsService } from '$lib/services/settings.svelte';
	import { startSync, stopSync } from '$lib/utils/sync';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import { cn } from '$lib/utils.js';
	import SyncDeviceId from './SyncDeviceId.svelte';
	import SyncLinkedDevices from './SyncLinkedDevices.svelte';
	import * as m from '$paraglide/messages.js';

	async function toggleSync(enabled: boolean) {
		settingsService.setSyncEnabled(enabled);
		if (!enabled) {
			void stopSync();
			return;
		}
		try {
			await startSync();
		} catch (e) {
			toasterService.error(m.settings_sync_start_error(), errorMessage(e));
			settingsService.setSyncEnabled(false);
		}
	}

	const navItems: {
		id: string;
		label: string;
		icon: typeof SmartphoneIcon;
		component: Component;
	}[] = [
		{
			id: 'device-id',
			label: m.settings_sync_nav_device_id(),
			icon: SmartphoneIcon,
			component: SyncDeviceId
		},
		{
			id: 'linked',
			label: m.settings_sync_nav_linked(),
			icon: MonitorSmartphoneIcon,
			component: SyncLinkedDevices
		}
	];

	let activeSection = $state(navItems[0]);
	const ActiveSection = $derived(activeSection.component);
</script>

<div class="flex h-full flex-col">
	<div class="border-b px-6 py-4">
		<h2 class="text-base font-semibold">{m.settings_sync_heading()}</h2>
		<p class="mt-0.5 text-sm text-muted-foreground">{m.settings_sync_description()}</p>
	</div>

	<div class="flex items-center justify-between border-b px-6 py-4">
		<div class="space-y-0.5">
			<p class="text-sm font-medium">{m.settings_sync_enable_label()}</p>
			<p class="text-xs text-muted-foreground">{m.settings_sync_enable_helper()}</p>
		</div>
		<Switch.Root
			checked={settingsService.sync.enabled}
			onCheckedChange={(checked) => toggleSync(checked)}
			aria-label={m.settings_sync_enable_label()}
			class="inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-container-highest"
		>
			<Switch.Thumb
				class="pointer-events-none block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
			/>
		</Switch.Root>
	</div>

	{#if settingsService.sync.enabled}
		<div class="flex min-h-0 flex-1">
			<div class="flex w-44 shrink-0 flex-col gap-1 border-r bg-muted/30 p-3">
				{#each navItems as item (item.id)}
					<button
						onclick={() => (activeSection = item)}
						class={cn(
							'flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm transition-colors',
							activeSection.component === item.component
								? 'bg-sidebar-accent font-medium text-on-surface'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground'
						)}
					>
						<item.icon size="15" />
						{item.label}
					</button>
				{/each}
			</div>
			<div class="min-w-0 flex-1 overflow-y-auto px-6 py-6">
				<ActiveSection />
			</div>
		</div>
	{/if}
</div>
