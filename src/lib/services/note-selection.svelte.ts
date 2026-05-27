import { notesService, newNoteContent } from './notes.svelte';
import { uiState } from './ui-state.svelte';

type Selection = { noteId: string; tag: string | null; composedKey: string };

class NoteSelectionService {
	#selection = $state<Selection | null>(null);
	composedKey = $derived([...uiState.composedTags].sort().join('\x00'));
	selectedNoteId = $derived.by(() => {
		const sel = this.#selection;
		if (sel && sel.tag === uiState.activeTag && sel.composedKey === this.composedKey) {
			return sel.noteId;
		}
		return notesService.notes[0]?.id ?? null;
	});

	select(noteId: string): void {
		this.#selection = { noteId, tag: uiState.activeTag, composedKey: this.composedKey };
	}

	async createNew(): Promise<string> {
		const id = await notesService.create(newNoteContent(uiState.activeTag));
		this.select(id);
		return id;
	}
}

export const noteSelection = new NoteSelectionService();
