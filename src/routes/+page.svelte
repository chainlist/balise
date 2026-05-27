<script lang="ts">
	import { notesService } from '$lib/services/notes.svelte';
	import { noteSelection } from '$lib/services/note-selection.svelte';
	import * as m from '$paraglide/messages.js';
	import NoteEditor from '$lib/components/notes/NoteEditor.svelte';

	const selectedNote = $derived(
		notesService.notes.find((n) => n.id === noteSelection.selectedNoteId) ?? null
	);
</script>

<div class="h-full w-full bg-primary/5">
	{#if selectedNote}
		{#key selectedNote.id}
			<NoteEditor note={selectedNote} />
		{/key}
	{:else}
		<div class="flex h-full items-center justify-center">
			<p class="text-sm text-muted-foreground">{m.note_empty_state()}</p>
		</div>
	{/if}
</div>
