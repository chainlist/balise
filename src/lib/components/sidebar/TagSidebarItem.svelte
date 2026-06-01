<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { tagDisplayName, UNTAGGED_FILTER } from '$lib/services/tags.svelte';
	import type { Tag } from '$lib/models/tag';
	import { Settings2Icon, PinIcon } from '@lucide/svelte';

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
	class="group/tag-item relative inline-flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-on-surface-variant transition-all select-none hover:text-on-surface data-active:rounded-l-none data-active:border-l-[3px] data-active:border-primary-container data-active:bg-sidebar-accent data-active:font-medium data-active:text-on-surface"
>
	<div class="flex min-w-0 items-center gap-2">
		{#if tag.pinned}
			<PinIcon
				size="14"
				style="color: {tag.color ?? 'currentColor'};"
				class="shrink-0 text-sidebar-foreground/30"
			/>
		{:else if tag.tag === UNTAGGED_FILTER}
			<span class="size-2 shrink-0 rounded-full border border-dashed border-sidebar-foreground/30"
			></span>
		{:else if tag.color}
			<span class="shrink-0 text-sm" style="color: {tag.color};">#</span>
		{:else}
			<span class="shrink-0 text-sm text-sidebar-foreground/30">#</span>
		{/if}
		<span class="truncate">{tagDisplayName(tag)}</span>
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
