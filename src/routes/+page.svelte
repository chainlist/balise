<script lang="ts">
	import NotesSidebar from '$lib/components/notes/NotesSidebar.svelte';
	import NoteEditor from '$lib/components/notes/NoteEditor.svelte';
	import type { Note } from '$lib/services/notes.svelte';
</script>

<NotesSidebar>
	{#snippet children(note: Note | null)}
		{#if note}
			{#key note.id}
				<NoteEditor {note} />
			{/key}
		{:else}
			<div class="flex flex-1 items-center justify-center">
				<p class="text-sm text-muted-foreground">Select a note or create a new one.</p>
			</div>
		{/if}
	{/snippet}
</NotesSidebar>
