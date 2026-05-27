<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { noteSelection } from '$lib/services/note-selection.svelte';
	import { noteSignals } from '$lib/services/note-signals';
	import SidebarCard from '$lib/components/sidebar/SidebarCard.svelte';
	import SidebarHeader from '$lib/components/sidebar/SidebarHeader.svelte';
	import BrowseCard from '$lib/components/sidebar/BrowseCard.svelte';
	import TagsCard from '$lib/components/sidebar/TagsCard.svelte';
	import NotesCard from '$lib/components/sidebar/NotesCard.svelte';
	import * as m from '$paraglide/messages.js';

	type CardId = 'browse' | 'tags' | 'notes';

	let openCard = $state<CardId>('browse');
	let mounted = $state(false);
	let prevTag: string | null = uiState.activeTag;

	onMount(() => {
		mounted = true;
	});

	$effect(() => {
		const tag = uiState.activeTag;
		if (mounted && tag !== prevTag && tag !== null) {
			openCard = 'notes';
		}
		prevTag = tag;
	});

	$effect(() => {
		uiState.activeNoteId = noteSelection.selectedNoteId;
	});

	$effect(() =>
		noteSignals.onSelectNote(async (id) => {
			noteSelection.select(id);
			openCard = 'notes';
			if (page.url.pathname !== '/') await goto(resolve('/'));
		})
	);

	function setOpen(card: CardId) {
		if (openCard !== card) openCard = card;
	}
</script>

<div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-primary/5 p-3">
	<SidebarCard collapsible={false} fitContent>
		<SidebarHeader />
	</SidebarCard>
	<SidebarCard
		title={m.nav_browse()}
		open={openCard === 'browse'}
		onToggle={() => setOpen('browse')}
		fitContent
	>
		<BrowseCard onPickAllNotes={() => setOpen('notes')} />
	</SidebarCard>
	<SidebarCard title={m.nav_tags()} open={openCard === 'tags'} onToggle={() => setOpen('tags')}>
		<TagsCard />
	</SidebarCard>
	<SidebarCard title={m.nav_notes()} open={openCard === 'notes'} onToggle={() => setOpen('notes')}>
		<NotesCard />
	</SidebarCard>
</div>
