<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { notesService, newNoteContent } from '$lib/services/notes.svelte';
	import {
		BookOpenText,
		LayoutDashboardIcon,
		NotebookIcon,
		CheckSquareIcon,
		Settings2Icon,
		PlusIcon
	} from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	const isDashboard = $derived(page.url.pathname === '/dashboard');
	const isJournal = $derived(page.url.pathname === '/journal');
	const isNotesRoot = $derived(page.url.pathname === '/');

	function handleAllNotesClick() {
		uiState.setActiveTag(null);
		goto(resolve('/'));
	}

	async function handleCreate() {
		const id = await notesService.create(newNoteContent(uiState.activeTag));
		uiState.setActiveNote(id);
		if (page.url.pathname !== '/') await goto(resolve('/'));
	}
</script>

<div class="flex flex-col gap-0.5 px-3 pt-1 pb-3">
	<button
		type="button"
		class="row"
		onclick={handleCreate}
		aria-label={m.shortcut_new_note_name()}
	>
		<PlusIcon class="size-4" />
		{m.shortcut_new_note_name()}
	</button>
	<a href={resolve('/dashboard')} class="row" class:active={isDashboard}>
		<LayoutDashboardIcon class="size-4" />
		{m.nav_dashboard()}
	</a>
	<a href={resolve('/journal')} class="row" class:active={isJournal}>
		<BookOpenText class="size-4" />
		{m.nav_journaling()}
	</a>
	<button
		type="button"
		class="row"
		class:active={isNotesRoot && uiState.activeTag === null}
		onclick={handleAllNotesClick}
	>
		<NotebookIcon class="size-4" />
		{m.nav_all_notes()}
	</button>
	<button type="button" class="row" disabled>
		<CheckSquareIcon class="size-4" />
		{m.nav_tasks()}
	</button>
	<button type="button" class="row" onclick={() => (uiState.isSettingsOpen = true)}>
		<Settings2Icon class="size-4" />
		{m.nav_settings()}
	</button>
</div>

<style lang="postcss">
	@reference "../../../routes/layout.css";

	.row {
		@apply inline-flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-on-surface-variant select-none hover:bg-sidebar-accent hover:text-on-surface;
	}

	.row[disabled] {
		@apply text-on-surface-variant/30 hover:bg-transparent hover:text-on-surface-variant/30;
	}

	.active {
		@apply bg-sidebar-accent text-on-surface;
	}
</style>
