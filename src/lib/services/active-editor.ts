import type { EditorView } from '@codemirror/view';

/**
 * Tracks the most recently focused note editor so app-level commands (e.g. the
 * command palette, which itself takes focus when open) can act on "the editor
 * the user was just in". CodeMirror keeps its selection while blurred, so
 * inserting at that selection lands where the cursor was.
 */
class ActiveEditorService {
	#view: EditorView | null = null;

	setActive(view: EditorView): void {
		this.#view = view;
	}

	/** Forget a view when it is destroyed, so we never act on a dead editor. */
	clear(view: EditorView): void {
		if (this.#view === view) this.#view = null;
	}

	/** Insert text at the last-focused editor's cursor. Returns false if none. */
	insertAtCursor(text: string): boolean {
		const view = this.#view;
		if (!view) return false;
		const { from, to } = view.state.selection.main;
		view.dispatch({
			changes: { from, to, insert: text },
			selection: { anchor: from + text.length }
		});
		view.focus();
		return true;
	}

	focus() {
		this.#view?.focus();
	}
}

export const activeEditorService = new ActiveEditorService();
