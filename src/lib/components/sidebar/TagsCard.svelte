<script lang="ts">
	import { tagsService } from '$lib/core/services/tags.svelte';
	import { UNTAGGED_FILTER } from '$lib/core/domain/tag';
	import type { Tag } from '$lib/core/domain/tag';
	import TagSidebarItem from '$lib/components/sidebar/TagSidebarItem.svelte';
	import TagSettingsSheet from '$lib/components/sidebar/TagSettingsSheet.svelte';

	let isTagSettingsOpen = $state(false);
	let tagPendingSettings = $state<Tag | null>(null);

	function openTagSettings(tag: Tag) {
		tagPendingSettings = tag;
		isTagSettingsOpen = true;
	}
</script>

<div class="flex flex-1 scrollbar-thin flex-col gap-1 overflow-y-auto px-3 pb-3">
	<TagSidebarItem
		tag={{
			tag: UNTAGGED_FILTER,
			count: tagsService.untaggedCount,
			color: null,
			display_name: 'Untagged',
			pinned: false
		}}
	/>
	{#each tagsService.tags as tag (tag.tag)}
		<TagSidebarItem {tag} onSettings={openTagSettings} />
	{/each}
</div>

<TagSettingsSheet bind:open={isTagSettingsOpen} tag={tagPendingSettings} />
