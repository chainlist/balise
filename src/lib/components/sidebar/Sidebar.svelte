<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { useSidebar } from '$lib/components/shadcn/sidebar/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { ChevronsUpDownIcon, PlusIcon, Trash2Icon } from '@lucide/svelte';
	import { switchDesk, setActiveTag, uiState } from '$lib/services/ui-state.svelte';
	import { UNTAGGED_FILTER } from '$lib/services/notes.svelte';
	import { tagState, type Tag } from '$lib/services/tags.svelte';
	import AddDeskSheet from '$lib/components/sidebar/AddDeskSheet.svelte';
	import DeleteDeskSheet from '$lib/components/sidebar/DeleteDeskSheet.svelte';
	import TagSettingsSheet from '$lib/components/sidebar/TagSettingsSheet.svelte';
	import TagSidebarItem from '$lib/components/sidebar/TagSidebarItem.svelte';

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

<div
	class="flex h-full flex-col overflow-hidden border-r border-r-zinc-200 bg-[oklch(0.327_0.037_284)] text-[#F9F9F9]"
>
	<header>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
	</header>
	<div class="flex flex-1 scrollbar-none flex-col overflow-auto px-2 [&::-webkit-scrollbar]:hidden">
		<TagSidebarItem
			tag={{
				tag: UNTAGGED_FILTER,
				count: tagState.untaggedCount,
				color: null,
				display_name: 'Untagged',
				pinned: false
			}}
		/>
		{#each tagState.tags as tag (tag.tag)}
			<TagSidebarItem {tag} onSettings={openTagSettings} />
		{/each}
	</div>
</div>
<!-- 
<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<Sidebar.SidebarMenu>
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="lg"
								class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
		</Sidebar.SidebarMenu>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Tags</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							isActive={uiState.activeTag === UNTAGGED_FILTER}
							onclick={() => setActiveTag(UNTAGGED_FILTER)}
						>
							<span
								class="size-2 shrink-0 rounded-full border border-dashed border-muted-foreground"
							></span>
							<span class="text-muted-foreground">Untagged</span>
							<span class="ml-auto text-xs text-muted-foreground">{tagState.untaggedCount}</span>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
					{#each tagState.tags as tag (tag.tag)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={uiState.activeTag === tag.tag}
								onclick={() => setActiveTag(tag.tag)}
							>
								<span
									class="size-2 shrink-0 rounded-full bg-primary"
									style={tag.color ? `background: ${tag.color};` : ''}
								></span>
								<span>{tagDisplayName(tag)}</span>
								<span class="ml-auto text-xs text-muted-foreground">{tag.count}</span>
							</Sidebar.MenuButton>
							<Sidebar.MenuAction
								showOnHover
								onclick={() => openTagSettings(tag)}
								aria-label="Tag settings"
							>
								<Settings2Icon />
							</Sidebar.MenuAction>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root> -->

<AddDeskSheet bind:open={isAddDeskOpen} />
<DeleteDeskSheet bind:open={isDeleteConfirmOpen} bind:deskName={deskPendingDelete} />
<TagSettingsSheet bind:open={isTagSettingsOpen} tag={tagPendingSettings} />

<style lang="postcss">
	@reference "../../../routes/layout.css";

	.active {
		@apply bg-primary/80;
	}
</style>
