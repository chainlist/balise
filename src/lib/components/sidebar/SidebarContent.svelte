<script lang="ts">
	import { tagsService, type Tag } from '$lib/services/tags.svelte';
	import { UNTAGGED_FILTER } from '$lib/services/tags.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import TagSidebarItem from '$lib/components/sidebar/TagSidebarItem.svelte';
	import TagSettingsSheet from '$lib/components/sidebar/TagSettingsSheet.svelte';
	import { LayoutDashboardIcon, NotebookIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import { page } from '$app/state';

	let isTagSettingsOpen = $state(false);
	let tagPendingSettings = $state<Tag | null>(null);
	const isDashboard = $derived(page.url.pathname === '/dashboard');
	const isNotesPage = $derived(page.url.pathname === '/');

	function openTagSettings(tag: Tag) {
		tagPendingSettings = tag;
		isTagSettingsOpen = true;
	}

	function handleAllNotesClick() {
		uiState.setActiveTag(null);
		goto(resolve('/'));
	}
</script>

<div class="relative flex flex-1 scrollbar-none flex-col gap-6 overflow-y-auto px-4 py-2">
	<div class="flex flex-col">
		<span
			class="mb-1 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase"
		>
			{m.nav_browse()}
		</span>
		<div class="pl-1">
			<a href={resolve('/dashboard')} class="button" class:active={isDashboard}>
				<LayoutDashboardIcon class="size-4" />
				{m.nav_dashboard()}
			</a>
			<button
				class="inline-flex w-full items-center gap-1 rounded py-1.5 text-on-surface-variant transition-all select-none hover:px-1 hover:text-on-surface"
				class:active={uiState.activeTag === null && isNotesPage}
				onclick={handleAllNotesClick}
			>
				<NotebookIcon class="size-4" />
				{m.nav_all_notes()}
			</button>
			<button disabled class="button">{m.nav_journaling()}</button>
			<button disabled class="button">{m.nav_tasks()}</button>
		</div>
	</div>

	<div class="flex w-full flex-1 scrollbar-none flex-col overflow-y-auto">
		<span
			class="sticky top-0 z-10 mb-1 block bg-sidebar text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase"
		>
			{m.nav_tags()}
		</span>
		<div class="pl-2">
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
	</div>
</div>

<TagSettingsSheet bind:open={isTagSettingsOpen} tag={tagPendingSettings} />

<style lang="postcss">
	@reference "../../../routes/layout.css";

	.button {
		@apply inline-flex w-full items-center gap-1 rounded py-1.5 transition-all select-none hover:px-2 hover:text-on-surface;
	}

	[disabled].button {
		@apply text-on-surface-variant/30 hover:px-0;
	}

	.active {
		@apply bg-sidebar-accent px-2;
	}
</style>
