<script lang="ts">
	import { Switch } from 'bits-ui';
	import { settingsService, SYNC_INTERVAL_OPTIONS } from '$lib/services/settings/settings.svelte';
	import { stopSync } from '$lib/utils/sync';
	import * as Select from '$lib/components/shadcn/select/index.js';
	import SyncAdvancedSettings from './SyncAdvancedSettings.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import * as m from '$paraglide/messages.js';

	function toggleSync(enabled: boolean) {
		settingsService.sync.setSyncEnabled(enabled);
		// The WS control-plane connection follows `enabled` reactively; syncs are
		// driven by edits and the on-connect handshake, so there's no loop to start.
		// On disable, tear down any running iroh endpoint.
		if (!enabled) void stopSync();
	}

	function changeInterval(value: string) {
		const minutes = Number(value);
		if (!Number.isFinite(minutes)) return;
		settingsService.sync.setSyncInterval(minutes);
	}

	const intervalLabel = $derived(
		m.settings_sync_interval_option({ minutes: settingsService.sync.state.intervalMinutes })
	);
</script>

<SettingsSection
	title={m.settings_sync_heading()}
	description={m.settings_sync_description()}
	bodyClass={null}
>
	<div class="flex items-center justify-between border-b px-6 py-4">
		<div class="space-y-0.5">
			<p class="text-sm font-medium">{m.settings_sync_enable_label()}</p>
			<p class="text-xs text-muted-foreground">{m.settings_sync_enable_helper()}</p>
		</div>
		<Switch.Root
			checked={settingsService.sync.state.enabled}
			onCheckedChange={(checked) => toggleSync(checked)}
			aria-label={m.settings_sync_enable_label()}
			class="inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-container-highest"
		>
			<Switch.Thumb
				class="pointer-events-none block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
			/>
		</Switch.Root>
	</div>

	{#if settingsService.sync.state.enabled}
		<div class="flex items-center justify-between border-b px-6 py-4">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">{m.settings_sync_interval_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_sync_interval_helper()}</p>
			</div>
			<Select.Root
				type="single"
				value={String(settingsService.sync.state.intervalMinutes)}
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
</SettingsSection>
