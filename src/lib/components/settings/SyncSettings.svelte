<script lang="ts">
	import { Switch } from 'bits-ui';
	import { settingsService, SYNC_INTERVAL_OPTIONS } from '$lib/services/settings.svelte';
	import { stopSync } from '$lib/utils/sync';
	import { deviceSyncService } from '$lib/services/device-sync.svelte';
	import * as Select from '$lib/components/shadcn/select/index.js';
	import SyncAdvancedSettings from './SyncAdvancedSettings.svelte';
	import * as m from '$paraglide/messages.js';

	function toggleSync(enabled: boolean) {
		settingsService.setSyncEnabled(enabled);
		// The iroh endpoint stays dormant until a paired device's sync request comes
		// in over the WS control plane (not built yet), so enabling sync only turns
		// the feature on. Tear down any running endpoint when it's switched off.
		if (!enabled) {
			deviceSyncService.stopInterval();
			void stopSync();
		}
	}

	function changeInterval(value: string) {
		const minutes = Number(value);
		if (!Number.isFinite(minutes)) return;
		settingsService.setSyncInterval(minutes);
		deviceSyncService.reschedule();
	}

	const intervalLabel = $derived(
		m.settings_sync_interval_option({ minutes: settingsService.sync.intervalMinutes })
	);
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
		<div class="flex items-center justify-between border-b px-6 py-4">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">{m.settings_sync_interval_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_sync_interval_helper()}</p>
			</div>
			<Select.Root
				type="single"
				value={String(settingsService.sync.intervalMinutes)}
				onValueChange={(v) => v && changeInterval(v)}
			>
				<Select.Trigger class="w-auto whitespace-nowrap">{intervalLabel}</Select.Trigger>
				<Select.Content>
					{#each SYNC_INTERVAL_OPTIONS as minutes (minutes)}
						<Select.Item
							value={String(minutes)}
							label={m.settings_sync_interval_option({ minutes })}
						/>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<SyncAdvancedSettings />
	{/if}
</div>
