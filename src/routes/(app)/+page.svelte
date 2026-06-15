<script lang="ts">
	import { notesService } from '$lib/services/content/notes.svelte';
	import { uiState } from '$lib/services/app/ui-state.svelte';
	import * as m from '$paraglide/messages.js';
	import NoteEditor from '$lib/components/notes/NoteEditor.svelte';

	const selectedNote = $derived(
		notesService.notes.find((n) => n.id === uiState.activeNoteId) ?? null
	);
</script>

<div class="frost h-full w-full">
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
