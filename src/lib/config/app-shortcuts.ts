import type { ShortcutDefinition } from '$lib/core/services/shortcuts.svelte';
import { notesService, newNoteContent } from '$lib/core/services/notes.svelte';
import { uiState } from '$lib/core/services/ui-state.svelte';
import { activeEditorService } from '$lib/core/services/active-editor';
import { settingsService } from '$lib/core/services/settings/settings.svelte';
import { formatDate } from '$lib/core/domain/datetime';
import { eventBus } from '$lib/core/services/events/event-bus';
import { toasterService, errorMessage } from '$lib/core/services/toaster';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import * as m from '$paraglide/messages.js';

async function openQuickWindow(): Promise<void> {
	const win = await WebviewWindow.getByLabel('quick');
	if (!win) return;
	await win.show();
	await win.setFocus();
}

export const APP_SHORTCUTS: ShortcutDefinition[] = [
	{
		id: 'open-command-palette',
		name: m.shortcut_open_command_palette_name,
		description: m.shortcut_open_command_palette_desc,
		defaultBinding: '$mod+k',
		bypassGuard: true,
		run: () => {
			uiState.modal.isCommandPaletteOpen = !uiState.modal.isCommandPaletteOpen;
		}
	},
	{
		id: 'goto-knowledge-graph',
		name: m.shortcut_goto_knowledge_graph_name,
		description: m.shortcut_goto_knowledge_graph_desc,
		defaultBinding: '$mod+g',
		bypassGuard: true,
		run: () => goto(resolve('/graph'))
	},
	{
		id: 'open-settings',
		name: m.shortcut_open_settings_name,
		description: m.shortcut_open_settings_desc,
		defaultBinding: '$mod+,',
		bypassGuard: true,
		run: () => {
			uiState.modal.isSettingsOpen = !uiState.modal.isSettingsOpen;
		}
	},
	{
		id: 'new-note',
		name: m.shortcut_new_note_name,
		description: m.shortcut_new_note_desc,
		defaultBinding: '$mod+n',
		run: async () => {
			try {
				const id = await notesService.create(newNoteContent(uiState.activeTag));
				eventBus.notes.select.emit(id);
			} catch (e) {
				toasterService.error(m.note_create_error_failed(), errorMessage(e));
			}
		}
	},
	{
		id: 'delete-note',
		name: m.shortcut_delete_note_name,
		description: m.shortcut_delete_note_desc,
		defaultBinding: '$mod+Delete',
		run: () => {
			if (uiState.activeNoteId) eventBus.notes.deleteRequested.emit(uiState.activeNoteId);
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
			if (idx > 0) eventBus.notes.select.emit(notes[idx - 1].id);
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
			if (idx !== -1 && idx < notes.length - 1) eventBus.notes.select.emit(notes[idx + 1].id);
		}
	},
	{
		id: 'insert-today-date',
		name: m.shortcut_insert_today_date_name,
		description: m.shortcut_insert_today_date_desc,
		defaultBinding: '$mod+;',
		run: () => {
			const text = formatDate(
				new Date(),
				settingsService.general.state.dateFormat,
				settingsService.general.state.language
			);
			if (!activeEditorService.insertAtCursor(text)) {
				toasterService.warning(m.insert_date_no_editor());
			}
		}
	},
	{
		id: 'toggle-zen-mode',
		name: m.shortcut_toggle_zen_mode_name,
		description: m.shortcut_toggle_zen_mode_desc,
		defaultBinding: '$mod+Shift+z',
		run: () => {
			uiState.modal.isZenModeActive = !uiState.modal.isZenModeActive;
		}
	},
	{
		id: 'open-quick-capture',
		name: m.shortcut_open_quick_capture_name,
		description: m.shortcut_open_quick_capture_desc,
		defaultBinding: '$mod+Shift+Space',
		global: true,
		run: () => openQuickWindow()
	}
];
