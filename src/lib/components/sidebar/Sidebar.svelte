<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { useSidebar } from '$lib/components/shadcn/sidebar/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import {
		ChevronsUpDownIcon,
		PlusIcon,
		Trash2Icon,
		Settings2Icon,
		LayoutListIcon
	} from '@lucide/svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { UNTAGGED_FILTER } from '$lib/services/notes.svelte';
	import { tagsService, type Tag } from '$lib/services/tags.svelte';
	import AddDeskSheet from '$lib/components/sidebar/AddDeskSheet.svelte';
	import DeleteDeskSheet from '$lib/components/sidebar/DeleteDeskSheet.svelte';
	import TagSettingsSheet from '$lib/components/sidebar/TagSettingsSheet.svelte';
	import TagSidebarItem from '$lib/components/sidebar/TagSidebarItem.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';

	const sidebar = useSidebar();
	const desks = $derived(uiState.desks);
	const selectedDesk = $derived(uiState.activeDesk);
	let isAddDeskOpen = $state(false);
	let isDeleteConfirmOpen = $state(false);
	let deskPendingDelete = $state<string | null>(null);
	let isTagSettingsOpen = $state(false);
	let tagPendingSettings = $state<Tag | null>(null);

	function openTagSettings(tag: Tag) {
		tagPendingSettings = tag;
		isTagSettingsOpen = true;
	}

	async function handleSelectDesk(desk: string) {
		await uiState.switchDesk(desk);
	}

	function promptDeleteDesk(desk: string) {
		deskPendingDelete = desk;
		isDeleteConfirmOpen = true;
	}
</script>

<Sidebar.Root>
	<Sidebar.Header class="border-b border-sidebar-border pb-3">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<div class="flex items-center gap-3 px-3 py-4">
					<div
						class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground"
					>
						#
					</div>
					<div>
						<h1 class="text-base leading-tight font-semibold text-sidebar-foreground">Balise</h1>
						<p class="text-xs leading-tight text-sidebar-foreground/50">Note Management</p>
					</div>
				</div>
			</Sidebar.MenuItem>
			<Sidebar.MenuItem>
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
									<span class="sr-only">Delete desk</span>
								</Button>
							</DropdownMenu.Item>
						{/each}
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="gap-2 rounded p-2" onclick={() => (isAddDeskOpen = true)}>
							<div class="flex size-6 items-center justify-center rounded-md border">
								<PlusIcon class="size-4" />
							</div>
							Add a new desk
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel
				class="px-3 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase"
			>
				Navigation Tags
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<TagSidebarItem
							tag={{
								tag: UNTAGGED_FILTER,
								count: tagsService.untaggedCount,
								color: null,
								display_name: 'Untagged',
								pinned: false
							}}
						/>
					</Sidebar.MenuItem>
					{#each tagsService.tags as tag (tag.tag)}
						<Sidebar.MenuItem>
							<TagSidebarItem {tag} onSettings={openTagSettings} />
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer class="gap-2 border-t border-sidebar-border pt-3 pb-4">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Button
					variant="ghost"
					size="sm"
					class="w-full justify-start gap-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
					onclick={() => (uiState.isSettingsOpen = true)}
				>
					<Settings2Icon class="size-4" />
					Settings
				</Button>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>

<AddDeskSheet bind:open={isAddDeskOpen} />
<DeleteDeskSheet bind:open={isDeleteConfirmOpen} bind:deskName={deskPendingDelete} />
<TagSettingsSheet bind:open={isTagSettingsOpen} tag={tagPendingSettings} />
<SettingsModal open={uiState.isSettingsOpen} />
