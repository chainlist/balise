import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin, hideMark, isMarkRevealed, type MarkMode } from './shared';

function buildHeaderDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		if (mode === 'always') return Decoration.none;

		const { state } = view;
		const cursorPos = state.selection.main.head;
		const ranges: Range<Decoration>[] = [];

		syntaxTree(state).iterate({
			enter(node) {
				if (node.name !== 'HeaderMark') return;
				const parent = node.node.parent;
				if (parent && isMarkRevealed(mode, parent.from, parent.to, cursorPos)) return;

				// Swallow the trailing space after the # marks.
				const lineEnd = state.doc.lineAt(node.from).to;
				ranges.push(hideMark.range(node.from, Math.min(node.to + 1, lineEnd)));
			}
		});

		return Decoration.set(ranges);
	};
}

export const mdHeaderPlugin = (mode: MarkMode) => makePlugin(buildHeaderDecos(mode));
