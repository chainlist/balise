<script lang="ts">
	import { Switch } from 'bits-ui';
	import { settingsService } from '$lib/services/settings.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as m from '$paraglide/messages.js';

	const disabled = $derived(!settingsService.sync.enabled);

	const ROOT_CLASS =
		'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-container-highest';
	const THUMB_CLASS =
		'pointer-events-none block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5';
</script>

<div class="flex h-full flex-col">
	<div class="border-b px-6 py-4">
		<h2 class="text-base font-semibold">{m.settings_sync_nav_sharing()}</h2>
		<p class="mt-0.5 text-sm text-muted-foreground">{m.settings_sync_sharing_description()}</p>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto">
		{#if disabled}
			<div class="px-6 pt-6">
				<div class="flex items-center justify-between gap-3 rounded border bg-muted/40 px-4 py-3">
					<p class="text-sm text-muted-foreground">{m.settings_sync_disabled_notice()}</p>
					<Button size="sm" class="shrink-0" onclick={() => settingsService.setSyncEnabled(true)}>
						{m.settings_sync_enable_action()}
					</Button>
				</div>
			</div>
		{/if}

		<div class={cn(disabled && 'pointer-events-none opacity-50')} aria-disabled={disabled}>
			<div class="flex items-center justify-between gap-3 border-b px-6 py-4">
				<div class="space-y-0.5">
					<p class="text-sm font-medium">{m.settings_sync_share_settings_label()}</p>
					<p class="text-xs text-muted-foreground">{m.settings_sync_share_settings_helper()}</p>
				</div>
				<Switch.Root
					checked={settingsService.sync.shareSettings}
					onCheckedChange={(v) => settingsService.setShareSettings(v)}
					aria-label={m.settings_sync_share_settings_label()}
					class={ROOT_CLASS}
				>
					<Switch.Thumb class={THUMB_CLASS} />
				</Switch.Root>
			</div>

			<div class="px-6 py-4">
				<div class="space-y-0.5">
					<p class="text-sm font-medium">{m.settings_sync_share_desks_label()}</p>
					<p class="text-xs text-muted-foreground">{m.settings_sync_share_desks_helper()}</p>
				</div>
				<div class="mt-3 space-y-1">
					{#each uiState.desks as desk (desk)}
						<div
							class="flex items-center justify-between gap-3 rounded px-3 py-2 hover:bg-muted/40"
						>
							<span
								class={cn(
									'truncate text-sm',
									!settingsService.isDeskShared(desk) && 'text-muted-foreground/50'
								)}>{desk}</span
							>
							<Switch.Root
								checked={settingsService.isDeskShared(desk)}
								onCheckedChange={(v) => settingsService.setDeskShared(desk, v)}
								aria-label={desk}
								class={ROOT_CLASS}
							>
								<Switch.Thumb class={THUMB_CLASS} />
							</Switch.Root>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
