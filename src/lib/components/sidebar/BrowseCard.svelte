<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { uiState } from '$lib/services/ui-state.svelte';
	import {
		BookOpenText,
		Share2Icon,
		NotebookIcon,
		CheckSquareIcon
	} from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	const isKnowledgeGraph = $derived(page.url.pathname === '/knowledge-graph');
	const isJournal = $derived(page.url.pathname === '/journal');
	const isNotesRoot = $derived(page.url.pathname === '/');

	function handleAllNotesClick() {
		uiState.setActiveTag(null);
		goto(resolve('/'));
	}
</script>

<div class="flex flex-col gap-0.5 px-3 pt-1 pb-3">
	<a href={resolve('/knowledge-graph')} class="row" class:active={isKnowledgeGraph}>
		<Share2Icon class="size-4" />
		{m.nav_knowledge_graph()}
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
