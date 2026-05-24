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

<div class="relative flex flex-1 scrollbar-none flex-col overflow-y-auto px-4 py-2">
	<TagSidebarItem
		tag={{
			tag: UNTAGGED_FILTER,
			count: tagsService.untaggedCount,
			color: null,
			display_name: 'Untagged',
			pinned: false
		}}
	/>
	{#each tagsService.tags as tag, i (tag.tag)}
		<TagSidebarItem {tag} onSettings={openTagSettings} delay={i * 25} />
	{/each}
</div>

<TagSettingsSheet bind:open={isTagSettingsOpen} tag={tagPendingSettings} />
