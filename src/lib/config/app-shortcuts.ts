import type { ShortcutDefinition } from '$lib/services/shortcuts.svelte';
import { createNote, newNoteContent } from '$lib/services/notes.svelte';
import { uiState } from '$lib/services/ui-state.svelte';

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
			const id = await createNote(newNoteContent(uiState.activeTag));
			uiState.pendingNoteSelection = id;
		}
	}
];
