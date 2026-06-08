import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { makePlugin } from './shared';
import * as m from '$paraglide/messages.js';

function buildPlaceholderDeco(view: EditorView): DecorationSet {
	const sel = view.state.selection.main;
	if (!sel.empty) return Decoration.none;
	const line = view.state.doc.lineAt(sel.head);
	if (line.length !== 0) return Decoration.none;
	const deco = Decoration.line({ attributes: { 'data-placeholder': m.editor_placeholder() } });
	return Decoration.set(deco.range(line.from));
}

export const mdPlaceholderPlugin = makePlugin(buildPlaceholderDeco);
