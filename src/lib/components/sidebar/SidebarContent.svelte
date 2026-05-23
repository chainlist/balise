<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { tagsService, type Tag } from '$lib/services/tags.svelte';
	import { UNTAGGED_FILTER } from '$lib/services/tags.svelte';
	import TagSidebarItem from '$lib/components/sidebar/TagSidebarItem.svelte';
	import TagSettingsSheet from '$lib/components/sidebar/TagSettingsSheet.svelte';

	let isTagSettingsOpen = $state(false);
	let tagPendingSettings = $state<Tag | null>(null);

	function openTagSettings(tag: Tag) {
		tagPendingSettings = tag;
		isTagSettingsOpen = true;
	}
</script>

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

<TagSettingsSheet bind:open={isTagSettingsOpen} tag={tagPendingSettings} />
