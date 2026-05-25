import type { ShortcutDefinition } from '$lib/services/shortcuts.svelte';
import { notesService, newNoteContent } from '$lib/services/notes.svelte';
import { uiState } from '$lib/services/ui-state.svelte';
import { noteSignals } from '$lib/services/note-signals';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import * as m from '$paraglide/messages.js';

export const APP_SHORTCUTS: ShortcutDefinition[] = [
	{
		id: 'open-command-palette',
		name: m.shortcut_open_command_palette_name,
		description: m.shortcut_open_command_palette_desc,
		defaultBinding: '$mod+k',
		bypassGuard: true,
		run: () => {
			uiState.isCommandPaletteOpen = !uiState.isCommandPaletteOpen;
		}
	},
	{
		id: 'goto-dashboard',
		name: m.shortcut_goto_dashboard_name,
		description: m.shortcut_goto_dashboard_desc,
		defaultBinding: '$mod+g',
		bypassGuard: true,
		run: () => goto(resolve('/dashboard'))
	},
	{
		id: 'open-settings',
		name: m.shortcut_open_settings_name,
		description: m.shortcut_open_settings_desc,
		defaultBinding: '$mod+,',
		bypassGuard: true,
		run: () => {
			uiState.isSettingsOpen = !uiState.isSettingsOpen;
		}
	},
	{
		id: 'new-note',
		name: m.shortcut_new_note_name,
		description: m.shortcut_new_note_desc,
		defaultBinding: '$mod+n',
		run: async () => {
			const id = await notesService.create(newNoteContent(uiState.activeTag));
			noteSignals.signalSelectNote(id);
		}
	},
	{
		id: 'delete-note',
		name: m.shortcut_delete_note_name,
		description: m.shortcut_delete_note_desc,
		defaultBinding: '$mod+Delete',
		run: () => {
			if (uiState.activeNoteId) noteSignals.signalDeleteNote(uiState.activeNoteId);
		}
	},
	{
		id: 'prev-note',
		name: m.shortcut_prev_note_name,
		description: m.shortcut_prev_note_desc,
		defaultBinding: 'Alt+ArrowUp',
		run: () => {
			const notes = notesService.notes;
			const idx = notes.findIndex((n) => n.id === uiState.activeNoteId);
			if (idx > 0) noteSignals.signalSelectNote(notes[idx - 1].id);
		}
	},
	{
		id: 'next-note',
		name: m.shortcut_next_note_name,
		description: m.shortcut_next_note_desc,
		defaultBinding: 'Alt+ArrowDown',
		run: () => {
			const notes = notesService.notes;
			const idx = notes.findIndex((n) => n.id === uiState.activeNoteId);
			if (idx !== -1 && idx < notes.length - 1) noteSignals.signalSelectNote(notes[idx + 1].id);
		}
	}
];
