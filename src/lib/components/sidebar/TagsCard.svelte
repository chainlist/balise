<script lang="ts">
	import { tagsService } from '$lib/services/tags.svelte';
	import { PINNED_FILTER, UNTAGGED_FILTER } from '$lib/domain/tag';
	import type { Tag } from '$lib/domain/tag';
	import TagSidebarItem from '$lib/components/sidebar/TagSidebarItem.svelte';
	import TagSettingsSheet from '$lib/components/sidebar/TagSettingsSheet.svelte';
	import * as m from '$paraglide/messages.js';

	let isTagSettingsOpen = $state(false);
	let tagPendingSettings = $state<Tag | null>(null);

	function openTagSettings(tag: Tag) {
		tagPendingSettings = tag;
		isTagSettingsOpen = true;
	}
</script>

<div class="flex scrollbar-thin flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
	<TagSidebarItem
		tag={{
			tag: UNTAGGED_FILTER,
			count: tagsService.untaggedCount,
			color: null,
			display_name: m.nav_untagged(),
			pinned: false
		}}
	/>
	{#if tagsService.pinnedCount > 0}
		<TagSidebarItem
			tag={{
				tag: PINNED_FILTER,
				count: tagsService.pinnedCount,
				color: null,
				display_name: m.nav_pinned(),
				pinned: false
			}}
		/>
	{/if}
	{#each tagsService.tags as tag (tag.tag)}
		<TagSidebarItem {tag} onSettings={openTagSettings} />
	{/each}
</div>

<TagSettingsSheet bind:open={isTagSettingsOpen} tag={tagPendingSettings} />
