<script lang="ts">
	import { LayoutListIcon, Trash2Icon } from '@lucide/svelte';
	import { uiState } from '$lib/services/app/ui-state.svelte';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import Badge from '$lib/components/Badge.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import DeskSettingsSheet from '$lib/components/sidebar/DeskSettingsSheet.svelte';
	import DeleteDeskSheet from '$lib/components/sidebar/DeleteDeskSheet.svelte';
	import * as m from '$paraglide/messages.js';

	let isManageOpen = $state(false);
	let manageDeskName = $state<string | null>(null);
	let isDeleteOpen = $state(false);
	let deleteDeskName = $state<string | null>(null);

	const desks = $derived(uiState.desks);

	function openManage(desk: string) {
		manageDeskName = desk;
		isManageOpen = true;
	}

	function openDelete(desk: string) {
		deleteDeskName = desk;
		isDeleteOpen = true;
	}
</script>

<SettingsSection
	title={m.settings_desks_heading()}
	description={m.settings_desks_description()}
	bodyClass={null}
>
	<div class="min-h-0 flex-1 overflow-y-auto px-6 py-6">
		<div class="flex flex-col gap-2">
			{#each desks as desk (desk)}
				<div class="group flex items-center gap-3 rounded-lg border px-3 py-2.5">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-3 text-left"
						onclick={() => openManage(desk)}
					>
						<LayoutListIcon size="18" class="shrink-0 text-muted-foreground" />
						<span class="truncate text-sm font-medium">{desk}</span>
					</button>
					{#if desk === uiState.activeDesk}
						<Badge>{m.settings_desks_active()}</Badge>
					{/if}
					{#if settingsService.sync.state.enabled && settingsService.sync.isDeskShared(desk)}
						<Badge variant="primary">{m.settings_desks_shared()}</Badge>
					{/if}
					<Button
						size="icon"
						variant="ghost"
						class="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
						disabled={desks.length <= 1}
						onclick={() => openDelete(desk)}
					>
						<Trash2Icon size="15" />
						<span class="sr-only">{m.desk_delete_title()}</span>
					</Button>
				</div>
			{/each}
		</div>
	</div>
</SettingsSection>

<DeskSettingsSheet bind:open={isManageOpen} bind:deskName={manageDeskName} />
<DeleteDeskSheet bind:open={isDeleteOpen} bind:deskName={deleteDeskName} />
