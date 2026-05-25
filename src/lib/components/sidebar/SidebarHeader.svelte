<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { useSidebar } from '$lib/components/shadcn/sidebar/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { ChevronsUpDownIcon, PlusIcon, Trash2Icon, LayoutListIcon } from '@lucide/svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import AddDeskSheet from '$lib/components/sidebar/AddDeskSheet.svelte';
	import DeleteDeskSheet from '$lib/components/sidebar/DeleteDeskSheet.svelte';
	import * as m from '$paraglide/messages.js';

	const sidebar = useSidebar();
	const desks = $derived(uiState.desks);
	const selectedDesk = $derived(uiState.activeDesk);
	let isAddDeskOpen = $state(false);
	let isDeleteConfirmOpen = $state(false);
	let deskPendingDelete = $state<string | null>(null);

	async function handleSelectDesk(desk: string) {
		await uiState.switchDesk(desk);
	}

	function promptDeleteDesk(desk: string) {
		deskPendingDelete = desk;
		isDeleteConfirmOpen = true;
	}
</script>

<header class="flex flex-col gap-2 p-4">
	<h1 class="text-2xl font-bold">Balise</h1>
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
				<DropdownMenu.Item class="group rounded" onclick={() => handleSelectDesk(desk)}>
					<span class="truncate rounded">{desk}</span>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						class="ml-auto h-6 w-6 rounded text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
						onclick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							promptDeleteDesk(desk);
						}}
					>
						<Trash2Icon class="size-3.5" />
						<span class="sr-only">{m.desk_delete_title()}</span>
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
</header>
<hr />

<AddDeskSheet bind:open={isAddDeskOpen} />
<DeleteDeskSheet bind:open={isDeleteConfirmOpen} bind:deskName={deskPendingDelete} />
