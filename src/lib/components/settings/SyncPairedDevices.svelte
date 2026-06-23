<script lang="ts">
	import { settingsService } from '$lib/core/services/settings/settings.svelte';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import SyncLinkedDevices from './SyncLinkedDevices.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import * as m from '$paraglide/messages.js';

	const disabled = $derived(!settingsService.sync.state.enabled);
</script>

<SettingsSection
	title={m.settings_sync_nav_paired()}
	description={m.settings_sync_paired_description()}
	bodyClass={null}
>
	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-6">
		{#if disabled}
			<div class="mb-4 flex items-center justify-between gap-3 rounded border bg-muted/40 px-4 py-3">
				<p class="text-sm text-muted-foreground">{m.settings_sync_disabled_notice()}</p>
				<Button size="sm" class="shrink-0" onclick={() => settingsService.sync.setSyncEnabled(true)}>
					{m.settings_sync_enable_action()}
				</Button>
			</div>
		{/if}

		<div class={cn(disabled && 'pointer-events-none opacity-50')} aria-disabled={disabled}>
			<SyncLinkedDevices />
		</div>
	</div>
</SettingsSection>
