import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin } from './shared';
import * as m from '$paraglide/messages.js';

// Don't let the placeholder bleed onto an empty line inside a code block.
function inCodeBlock(state: EditorState, pos: number): boolean {
	for (let node = syntaxTree(state).resolveInner(pos, 1); node; node = node.parent) {
		if (node.name === 'FencedCode' || node.name === 'CodeBlock') return true;
	}
	return false;
}

function buildPlaceholderDeco(view: EditorView): DecorationSet {
	const sel = view.state.selection.main;
	if (!sel.empty) return Decoration.none;
	const line = view.state.doc.lineAt(sel.head);
	if (line.length !== 0) return Decoration.none;
	if (inCodeBlock(view.state, sel.head)) return Decoration.none;
	const deco = Decoration.line({ attributes: { 'data-placeholder': m.editor_placeholder() } });
	return Decoration.set(deco.range(line.from));
}

export const mdPlaceholderPlugin = makePlugin(buildPlaceholderDeco);
