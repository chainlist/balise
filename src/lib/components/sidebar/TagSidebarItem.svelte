<script lang="ts">
	import { setActiveTag, uiState } from '$lib/services/ui-state.svelte';
	import { tagDisplayName, type Tag } from '$lib/services/tags.svelte';
	import { Settings2Icon, PinIcon } from '@lucide/svelte';
	import { UNTAGGED_FILTER } from '$lib/services/notes.svelte';
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';

	let { tag, onSettings }: { tag: Tag; onSettings?: (tag: Tag) => void } = $props();

	let isActive = $derived(uiState.activeTag === tag.tag);

	function handleSettingsClick(e: Event) {
		e.stopPropagation();
		onSettings?.(tag);
	}
</script>

<Sidebar.MenuButton
	{isActive}
	onclick={() => setActiveTag(tag.tag)}
	class="group/tag-item inline-flex w-full items-center justify-between rounded-lg px-3 py-1.5 transition-all select-none text-on-surface-variant hover:text-on-surface data-active:rounded-l-none data-active:border-l-[3px] data-active:border-primary-container data-active:bg-sidebar-accent data-active:text-on-surface data-active:font-medium"
>
	<div class="flex items-center gap-2 min-w-0">
		{#if tag.pinned}
			<PinIcon
				size="14"
				style="color: {tag.color ?? 'currentColor'};"
				class="shrink-0 text-sidebar-foreground/30"
			/>
		{:else if tag.tag === UNTAGGED_FILTER}
			<span class="size-2 shrink-0 rounded-full border border-dashed border-sidebar-foreground/30"></span>
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
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSettingsClick(e); } }}
	>
		<span class="text-xs text-sidebar-foreground/30 group-hover/tag-item:hidden">{tag.count}</span>
		{#if onSettings}
			<div class="hidden group-hover/tag-item:inline-block text-sidebar-foreground/40">
				<Settings2Icon size="16" />
			</div>
		{/if}
	</div>
</Sidebar.MenuButton>
