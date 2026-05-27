<script lang="ts">
	import { tagsService, type Tag, UNTAGGED_FILTER } from '$lib/services/tags.svelte';
	import TagSidebarItem from '$lib/components/sidebar/TagSidebarItem.svelte';
	import TagSettingsSheet from '$lib/components/sidebar/TagSettingsSheet.svelte';

	let isTagSettingsOpen = $state(false);
	let tagPendingSettings = $state<Tag | null>(null);

	function openTagSettings(tag: Tag) {
		tagPendingSettings = tag;
		isTagSettingsOpen = true;
	}
</script>

<div class="flex flex-1 flex-col overflow-y-auto px-3 pb-3 scrollbar-none">
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
		<TagSidebarItem {tag} onSettings={openTagSettings} delay={i * 15} />
	{/each}
</div>

<TagSettingsSheet bind:open={isTagSettingsOpen} tag={tagPendingSettings} />
