import type { EditorView } from '@codemirror/view';
import * as m from '$paraglide/messages.js';
import { assetsService } from '$lib/services/assets';
import { toasterService, errorMessage } from '$lib/services/toaster';
import { isCoverImageLine } from '$lib/domain/shared/markdown';

type SlashRange = { from: number; to: number };

/** Remove the typed `/command` text, leaving the cursor in its place. */
function clearSlash(view: EditorView, range: SlashRange): void {
	view.dispatch({
		changes: { from: range.from, to: range.to, insert: '' },
		selection: { anchor: range.from }
	});
}

/** Pick an image via the native dialog and copy it into the desk's attachments
 *  folder. Returns the `attachments/<file>` path to embed, or null if cancelled. */
async function pickImagePath(): Promise<string | null> {
	const filename = await assetsService.pickAndImportImage();
	return filename ? `attachments/${filename}` : null;
}

/** `/image`: pick an image and insert it as an embed at the cursor. */
export function insertImageAtCursor(view: EditorView, range: SlashRange): void {
	clearSlash(view, range);
	void (async () => {
		try {
			const path = await pickImagePath();
			if (!path) return;
			const pos = view.state.selection.main.from;
			const text = `![](${path})`;
			view.dispatch({
				changes: { from: pos, insert: text },
				selection: { anchor: pos + text.length }
			});
			view.focus();
		} catch (e) {
			toasterService.error(m.attachment_import_error_failed(), errorMessage(e));
		}
	})();
}

/** `/cover`: pick an image and place it as a full-width cover (`![cover](…)`) on
 *  its own line at the top of the note, replacing an existing cover if present. */
export function insertOrReplaceCover(view: EditorView, range: SlashRange): void {
	clearSlash(view, range);
	void (async () => {
		try {
			const path = await pickImagePath();
			if (!path) return;
			const markdown = `![cover](${path})`;
			const { state } = view;
			for (let i = 1; i <= state.doc.lines; i++) {
				const line = state.doc.line(i);
				if (line.text.trim() === '') continue;
				// First non-empty line: replace it if it is already a cover, otherwise
				// push the new cover above it.
				if (isCoverImageLine(line.text)) {
					view.dispatch({ changes: { from: line.from, to: line.to, insert: markdown } });
				} else {
					view.dispatch({ changes: { from: 0, insert: `${markdown}\n` } });
				}
				view.focus();
				return;
			}
			// Empty document.
			view.dispatch({ changes: { from: 0, insert: `${markdown}\n` } });
			view.focus();
		} catch (e) {
			toasterService.error(m.attachment_import_error_failed(), errorMessage(e));
		}
	})();
}
