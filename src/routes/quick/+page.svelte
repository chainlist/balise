<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { notesService, type Note } from '$lib/services/notes.svelte';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import NoteEditor from '$lib/components/notes/NoteEditor.svelte';

	let draftId = $state(crypto.randomUUID());
	let dbNoteId: string | null = null;
	let hasSaved = false;

	const draftNote = $derived<Note>({
		id: draftId,
		title: '',
		preview: '',
		pinned: false,
		archived: false,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	});

	function resetDraft() {
		draftId = crypto.randomUUID();
		dbNoteId = null;
		hasSaved = false;
	}

	onMount(async () => {
		const win = getCurrentWindow();
		await win.onCloseRequested(async (event) => {
			event.preventDefault();
			if (dbNoteId && !hasSaved) {
				await notesService.delete(dbNoteId);
			}
			resetDraft();
			await win.hide();
		});
	});

	const handleSave = async (content: string) => {
		hasSaved = content.trim().length > 0;
		if (!hasSaved) {
			if (dbNoteId) {
				await notesService.delete(dbNoteId);
				dbNoteId = null;
			}
			return;
		}
		if (!dbNoteId) {
			dbNoteId = await notesService.create(content);
		} else {
			await notesService.update(dbNoteId, content);
		}
	};
</script>

<div class="h-screen w-full bg-primary/5" in:fade={{ duration: 250 }}>
	{#key draftNote.id}
		<NoteEditor note={draftNote} onSave={handleSave} pinnable />
	{/key}
</div>
