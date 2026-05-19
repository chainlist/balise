<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { noteState, createNote, type Note, UNTAGGED_FILTER } from '$lib/services/notes.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import NotesSidebarHeader from '$lib/components/notes/NotesSidebarHeader.svelte';
	import NotesSidebarContent from '$lib/components/notes/NotesSidebarContent.svelte';

	let { children }: { children: Snippet<[Note | null]> } = $props();

	let selection = $state<{ noteId: string; tag: string | null; composedKey: string } | null>(null);
	const composedKey = $derived([...uiState.composedTags].sort().join('\x00'));
	const selectedNoteId = $derived(
		selection?.tag === uiState.activeTag && selection?.composedKey === composedKey
			? selection.noteId
			: (noteState.notes[0]?.id ?? null)
	);
	const selectedNote = $derived(noteState.notes.find((n) => n.id === selectedNoteId) ?? null);

	async function handleCreateNote() {
		const id = await createNote(
			'### New Note\n\n' +
				(uiState.activeTag && uiState.activeTag !== UNTAGGED_FILTER
					? `#${uiState.activeTag}\n\n`
					: '')
		);
		selection = { noteId: id, tag: uiState.activeTag, composedKey };
	}
</script>

<Sidebar.Provider class="h-full min-h-0">
	<Sidebar.Root collapsible="none">
		<NotesSidebarHeader oncreate={handleCreateNote} />

		<NotesSidebarContent
			notes={noteState.notes}
			{selectedNoteId}
			onselect={(noteId) => (selection = { noteId, tag: uiState.activeTag, composedKey })}
		/>
	</Sidebar.Root>

	<Sidebar.Inset class="h-full min-h-0 w-full">
		{@render children(selectedNote)}
	</Sidebar.Inset>
</Sidebar.Provider>
