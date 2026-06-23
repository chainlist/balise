<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { notesService } from '$lib/core/services/notes.svelte';
	import type { NoteListItem } from '$lib/core/domain/note';
	import { toasterService, errorMessage } from '$lib/core/services/toaster';
	import { resyncQuickCapture } from '$lib/core/services/quick-bootstrap';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import NoteEditor from '$lib/components/notes/NoteEditor.svelte';
	import * as m from '$paraglide/messages.js';

	let draftId = $state(crypto.randomUUID());
	let dbNoteId: string | null = null;
	let hasSaved = false;

	const draftNote = $derived<NoteListItem>({
		id: draftId,
		title: '',
		preview: '',
		pinned: false,
		archived: false,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	});

	function resetDraft() {
		draftId = crypto.randomUUID();
		dbNoteId = null;
		hasSaved = false;
	}

	onMount(async () => {
		const win = getCurrentWindow();

		// The window is long-lived (shown/hidden, never reloaded). Re-point it at the
		// current desk on focus, reconnecting the shared DB pool if the main window
		// closed it via a desk switch/rename/delete.
		await win.onFocusChanged(async ({ payload: focused }) => {
			if (!focused) return;
			try {
				await resyncQuickCapture();
			} catch (e) {
				toasterService.error(m.desk_switch_error_failed(), errorMessage(e));
			}
		});

		await win.onCloseRequested(async (event) => {
			event.preventDefault();
			if (dbNoteId && !hasSaved) {
				try {
					await notesService.delete(dbNoteId);
				} catch (e) {
					// Keep the window (and the toast) visible; the draft is still intact.
					toasterService.error(m.note_delete_error_failed(), errorMessage(e));
					return;
				}
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

<div class="frost h-screen w-full" in:fade={{ duration: 250 }}>
	{#key draftNote.id}
		<NoteEditor note={draftNote} onSave={handleSave} pinnable persistFolds={false} />
	{/key}
</div>
