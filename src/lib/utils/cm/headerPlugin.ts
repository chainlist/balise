import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin, hideMark, isMarkRevealed, type MarkMode } from './shared';

// H1 gets a full-width underline on the line itself, not on the heading-text
// span: a 100%-wide span would wrap below the `#` mark when the mark is revealed.
const h1Line = Decoration.line({ class: 'cm-md-h1-line' });

function buildHeaderDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		const { state } = view;
		const cursorPos = state.selection.main.head;
		const ranges: Range<Decoration>[] = [];

		syntaxTree(state).iterate({
			enter(node) {
				if (node.name === 'ATXHeading1') {
					ranges.push(h1Line.range(state.doc.lineAt(node.from).from));
					return;
				}
				if (node.name !== 'HeaderMark' || mode === 'always') return;
				const parent = node.node.parent;
				if (parent && isMarkRevealed(mode, parent.from, parent.to, cursorPos)) return;

				// Swallow the trailing space after the # marks.
				const lineEnd = state.doc.lineAt(node.from).to;
				ranges.push(hideMark.range(node.from, Math.min(node.to + 1, lineEnd)));
			}
		});

		return Decoration.set(ranges, true);
	};
}

export const mdHeaderPlugin = (mode: MarkMode) => makePlugin(buildHeaderDecos(mode));
