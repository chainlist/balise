<script lang="ts">
	import { ChevronRightIcon } from '@lucide/svelte';
	import { settingsService } from '$lib/core/services/settings/settings.svelte';
	import { SYNC_SERVER_URL } from '$lib/config/sync';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import * as m from '$paraglide/messages.js';

	let open = $state(false);
</script>

<div class="border-b">
	<button
		type="button"
		class="flex w-full items-center gap-2 px-6 py-4 text-left"
		onclick={() => (open = !open)}
	>
		<ChevronRightIcon
			size="16"
			class="text-muted-foreground transition-transform {open ? 'rotate-90' : ''}"
		/>
		<span class="text-sm font-medium">{m.settings_sync_advanced_label()}</span>
	</button>

	{#if open}
		<div class="space-y-3 px-6 pb-4">
			<p class="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
				{m.settings_sync_advanced_warning()}
			</p>
			<div class="space-y-2">
				<div class="space-y-0.5">
					<p class="text-sm font-medium">{m.settings_sync_server_label()}</p>
					<p class="text-xs text-muted-foreground">{m.settings_sync_server_helper()}</p>
				</div>
				<Input
					type="url"
					value={settingsService.sync.state.syncUrl}
					placeholder={SYNC_SERVER_URL}
					oninput={(e) => settingsService.sync.setSyncUrl(e.currentTarget.value)}
				/>
			</div>
		</div>
	{/if}
</div>
