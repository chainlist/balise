<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { useSidebar } from '$lib/components/shadcn/sidebar/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { ChevronsUpDownIcon, PlusIcon, LayoutListIcon, Settings } from '@lucide/svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import AddDeskSheet from '$lib/components/sidebar/AddDeskSheet.svelte';
	import DeskSettingsSheet from '$lib/components/sidebar/DeskSettingsSheet.svelte';
	import * as m from '$paraglide/messages.js';

	const sidebar = useSidebar();
	const desks = $derived(uiState.desks);
	const selectedDesk = $derived(uiState.activeDesk);
	let isAddDeskOpen = $state(false);
	let isDeskSettingsOpen = $state(false);
	let deskPendingSettings = $state<string | null>(null);

	async function handleSelectDesk(desk: string) {
		try {
			await uiState.switchDesk(desk);
		} catch (e) {
			toasterService.error(m.desk_switch_error_failed(), errorMessage(e));
		}
	}

	function openDeskSettings(desk: string) {
		deskPendingSettings = desk;
		isDeskSettingsOpen = true;
	}
</script>

<div class="flex flex-col gap-2 p-3">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold text-primary">Balise</h1>
		<Button variant="ghost" size="icon-sm" onclick={() => (uiState.modal.isSettingsOpen = true)}>
			<Settings class="size-3.5" />
		</Button>
	</div>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Sidebar.MenuButton
					{...props}
					size="sm"
					class="rounded border border-sidebar-border bg-sidebar text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground"
				>
					<div class="flex w-full items-center justify-between gap-2">
						<LayoutListIcon class="size-4 shrink-0 text-primary" />
						<span class="flex-1 font-medium">{selectedDesk}</span>
						<ChevronsUpDownIcon class="size-4 shrink-0 text-sidebar-foreground/40" />
					</div>
				</Sidebar.MenuButton>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content
			class="w-(--bits-dropdown-menu-anchor-width) rounded"
			side={sidebar.isMobile ? 'bottom' : 'right'}
			align="start"
		>
			{#each desks as desk (desk)}
				<DropdownMenu.Item
					class="group rounded {desk === selectedDesk
						? 'bg-sidebar-accent font-medium text-sidebar-foreground'
						: ''}"
					onclick={() => handleSelectDesk(desk)}
				>
					<span class="truncate rounded">{desk}</span>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						class="ml-auto h-6 w-6 rounded opacity-0 group-hover:opacity-100"
						onclick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							openDeskSettings(desk);
						}}
					>
						<Settings class="size-3.5" />
						<span class="sr-only">{m.desk_settings_title()}</span>
					</Button>
				</DropdownMenu.Item>
			{/each}
			<DropdownMenu.Separator />
			<DropdownMenu.Item class="gap-2 rounded p-2" onclick={() => (isAddDeskOpen = true)}>
				<div class="flex size-6 items-center justify-center rounded-md border">
					<PlusIcon class="size-4" />
				</div>
				{m.sidebar_add_desk()}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>

<AddDeskSheet bind:open={isAddDeskOpen} />
<DeskSettingsSheet bind:open={isDeskSettingsOpen} bind:deskName={deskPendingSettings} />
