import type { ShortcutDefinition } from '$lib/services/shortcuts.svelte';
import { notesService, newNoteContent } from '$lib/services/notes.svelte';
import { uiState } from '$lib/services/ui-state.svelte';
import { noteSignals } from '$lib/services/note-signals';

export const APP_SHORTCUTS: ShortcutDefinition[] = [
	{
		id: 'open-settings',
		name: 'Open Settings',
		description: 'Open or close the settings modal',
		defaultBinding: '$mod+,',
		bypassGuard: true,
		run: () => {
			uiState.isSettingsOpen = !uiState.isSettingsOpen;
		}
	},
	{
		id: 'new-note',
		name: 'New Note',
		description: 'Create a new note in the active tag',
		defaultBinding: '$mod+n',
		run: async () => {
			const id = await notesService.create(newNoteContent(uiState.activeTag));
			noteSignals.signalSelectNote(id);
		}
	},
	{
		id: 'delete-note',
		name: 'Delete Note',
		description: 'Delete the currently selected note',
		defaultBinding: '$mod+Delete',
		run: () => {
			if (uiState.activeNoteId) noteSignals.signalDeleteNote(uiState.activeNoteId);
		}
	},
	{
		id: 'prev-note',
		name: 'Previous Note',
		description: 'Select the note above in the list',
		defaultBinding: 'Alt+ArrowUp',
		run: () => {
			const notes = notesService.notes;
			const idx = notes.findIndex((n) => n.id === uiState.activeNoteId);
			if (idx > 0) noteSignals.signalSelectNote(notes[idx - 1].id);
		}
	},
	{
		id: 'next-note',
		name: 'Next Note',
		description: 'Select the note below in the list',
		defaultBinding: 'Alt+ArrowDown',
		run: () => {
			const notes = notesService.notes;
			const idx = notes.findIndex((n) => n.id === uiState.activeNoteId);
			if (idx !== -1 && idx < notes.length - 1) noteSignals.signalSelectNote(notes[idx + 1].id);
		}
	}
];
