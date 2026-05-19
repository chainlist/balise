<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { useSidebar } from '$lib/components/shadcn/sidebar/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { ChevronsUpDownIcon, PlusIcon, Trash2Icon, Settings2Icon } from '@lucide/svelte';
	import { switchDesk, uiState } from '$lib/services/ui-state.svelte';
	import { UNTAGGED_FILTER } from '$lib/services/notes.svelte';
	import { tagState, type Tag } from '$lib/services/tags.svelte';
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
		await switchDesk(desk);
	}

	function promptDeleteDesk(desk: string) {
		deskPendingDelete = desk;
		isDeleteConfirmOpen = true;
	}
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<dir class="px-4 py-1">
					<h1 class="text-primary text-2xl font-bold">Balise</h1>
				</dir>
			</Sidebar.MenuItem>
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="sm"
								class="bg-surface-container-highest text-on-surface-variant data-[state=open]:bg-surface-container-highest/50 data-[state=open]:text-on-surface-variant hover:bg-surface-container-highest/80 "
							>
								<div class="flex w-full items-center justify-between">
									<span>{selectedDesk}</span>
									<ChevronsUpDownIcon />
								</div>
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-(--bits-dropdown-menu-anchor-width)"
						side={sidebar.isMobile ? 'bottom' : 'right'}
						align="start"
					>
						{#each desks as desk (desk)}
							<DropdownMenu.Item class="group" onclick={() => handleSelectDesk(desk)}>
								<span class="truncate">{desk}</span>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									class="ml-auto h-6 w-6 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
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

						<DropdownMenu.Item class="gap-2 p-2" onclick={() => (isAddDeskOpen = true)}>
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
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<TagSidebarItem
								tag={{
									tag: UNTAGGED_FILTER,
									count: tagState.untaggedCount,
									color: null,
									display_name: 'Untagged',
									pinned: false
								}}
							/>
					</Sidebar.MenuItem>
					{#each tagState.tags as tag (tag.tag)}
						<Sidebar.MenuItem>
							<TagSidebarItem {tag} onSettings={openTagSettings} />
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<Button
			variant="ghost"
			size="sm"
			class="w-full justify-start gap-2 text-muted-foreground"
			onclick={() => (uiState.isSettingsOpen = true)}
		>
			<Settings2Icon class="size-4" />
			Settings
		</Button>
	</Sidebar.Footer>
</Sidebar.Root>

<AddDeskSheet bind:open={isAddDeskOpen} />
<DeleteDeskSheet bind:open={isDeleteConfirmOpen} bind:deskName={deskPendingDelete} />
<TagSettingsSheet bind:open={isTagSettingsOpen} tag={tagPendingSettings} />
<SettingsModal open={uiState.isSettingsOpen} />

<style lang="postcss">
	@reference "../../../routes/layout.css";

	.active {
		@apply bg-primary/80;
	}
</style>
