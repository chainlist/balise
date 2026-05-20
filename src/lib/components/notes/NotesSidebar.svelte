<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { noteState, createNote, newNoteContent, type Note } from '$lib/services/notes.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { onSelectNote } from '$lib/services/note-signals';
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

	$effect(() => onSelectNote((id) => {
		selection = { noteId: id, tag: uiState.activeTag, composedKey };
	}));

	// Publish the derived selection into shared state so shortcuts can reference it.
	$effect(() => {
		uiState.activeNoteId = selectedNoteId;
	});

	async function handleCreateNote() {
		const id = await createNote(newNoteContent(uiState.activeTag));
		selection = { noteId: id, tag: uiState.activeTag, composedKey };
	}
</script>

<!-- Intentionally a second independent SidebarProvider — this sidebar owns its own
     collapsed/open state, isolated from the outer app navigation sidebar. -->
<Sidebar.Provider class="h-full min-h-0">
	<Sidebar.Root collapsible="none">
		<NotesSidebarHeader onCreate={handleCreateNote} />

		<NotesSidebarContent
			notes={noteState.notes}
			{selectedNoteId}
			onSelect={(noteId) => (selection = { noteId, tag: uiState.activeTag, composedKey })}
		/>
	</Sidebar.Root>

	<Sidebar.Inset class="h-full min-h-0 w-full">
		{@render children(selectedNote)}
	</Sidebar.Inset>
</Sidebar.Provider>
