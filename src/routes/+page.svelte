<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { notesService, newNoteContent, type Note } from '$lib/services/notes.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { noteSignals } from '$lib/services/note-signals';
	import * as m from '$paraglide/messages.js';
	import NotesSidebar from '$lib/components/notes/NotesSidebar.svelte';
	import NoteEditor from '$lib/components/notes/NoteEditor.svelte';

	let selection = $state<{ noteId: string; tag: string | null; composedKey: string } | null>(null);
	const composedKey = $derived([...uiState.composedTags].sort().join('\x00'));
	const selectedNoteId = $derived(
		selection?.tag === uiState.activeTag && selection?.composedKey === composedKey
			? selection.noteId
			: (notesService.notes[0]?.id ?? null)
	);
	const selectedNote = $derived(notesService.notes.find((n) => n.id === selectedNoteId) ?? null);

	// Register external signal handler — assignment happens on signal fire, not during effect body.
	$effect(() => noteSignals.onSelectNote((id) => {
		selection = { noteId: id, tag: uiState.activeTag, composedKey };
	}));

	// Publish the derived selection into shared state so shortcuts can reference it.
	$effect(() => {
		uiState.activeNoteId = selectedNoteId;
	});

	async function handleCreateNote() {
		const id = await notesService.create(newNoteContent(uiState.activeTag));
		selection = { noteId: id, tag: uiState.activeTag, composedKey };
	}

	function handleSelect(noteId: string) {
		selection = { noteId, tag: uiState.activeTag, composedKey };
	}
</script>

<!-- Isolated from the outer app navigation SidebarProvider — owns its own open/close state. -->
<Sidebar.Provider class="h-full min-h-0">
	<NotesSidebar
		notes={notesService.notes}
		{selectedNoteId}
		onCreate={handleCreateNote}
		onSelect={handleSelect}
	/>
	<Sidebar.Inset class="h-full min-h-0 w-full bg-card">
		{#if selectedNote}
			{#key selectedNote.id}
				<NoteEditor note={selectedNote} />
			{/key}
		{:else}
			<div class="flex flex-1 items-center justify-center">
				<p class="text-sm text-muted-foreground">{m.note_empty_state()}</p>
			</div>
		{/if}
	</Sidebar.Inset>
</Sidebar.Provider>
