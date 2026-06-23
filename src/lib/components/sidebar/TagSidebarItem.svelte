<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { UNTAGGED_FILTER } from '$lib/domain/tag';
	import type { Tag } from '$lib/domain/tag';
	import { Settings2Icon, PinIcon, HashIcon } from '@lucide/svelte';
	import TagName from '../TagName.svelte';

	let { tag, onSettings }: { tag: Tag; onSettings?: (tag: Tag) => void } = $props();

	let isActive = $derived(uiState.activeTag === tag.tag);

	function handleSettingsClick(e: Event) {
		e.stopPropagation();
		onSettings?.(tag);
	}

	function handleTagClick(event: Event) {
		event.preventDefault();
		uiState.setActiveTag(tag.tag);
		goto(resolve('/'));
	}
</script>

<button
	data-tag={tag.tag}
	class:active={isActive}
	onclick={handleTagClick}
	class="group/tag-item relative inline-flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-on-surface-variant transition-all select-none hover:bg-sidebar-accent hover:text-on-surface data-active:rounded-l-none data-active:border-l-[3px] data-active:border-primary-container data-active:bg-sidebar-accent data-active:font-medium data-active:text-on-surface"
>
	<div class="flex min-w-0 items-center gap-2">
		<TagName {tag} untagged={tag.tag === UNTAGGED_FILTER} />
	</div>
	<div
		role="button"
		tabindex="0"
		aria-label="Open tag settings"
		class="flex shrink-0 gap-2"
		onclick={handleSettingsClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleSettingsClick(e);
			}
		}}
	>
		<span class="text-xs text-sidebar-foreground/30 group-hover/tag-item:hidden">{tag.count}</span>
		{#if onSettings}
			<div class="hidden text-sidebar-foreground/40 group-hover/tag-item:inline-block">
				<Settings2Icon size="16" />
			</div>
		{/if}
	</div>
</button>

<style lang="postcss">
	@reference "../../../routes/layout.css";

	.active {
		@apply bg-sidebar-accent px-2;
	}
</style>
