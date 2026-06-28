import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin, hideMark, isMarkRevealed, type MarkMode } from './shared';

// Heading lines carry a line decoration so spacing (and the H1 underline) applies
// to the whole line: padding/margin on the inline heading span has no layout
// effect, and a 100%-wide underline span would wrap below the `#` mark when the
// mark is revealed.
const headingLines: Record<string, Decoration> = {
	ATXHeading1: Decoration.line({ class: 'cm-md-h1-line' }),
	ATXHeading2: Decoration.line({ class: 'cm-md-h2-line' }),
	ATXHeading3: Decoration.line({ class: 'cm-md-h3-line' }),
	ATXHeading4: Decoration.line({ class: 'cm-md-h4-line' })
};

function buildHeaderDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		const { state } = view;
		const cursorPos = state.selection.main.head;
		const ranges: Range<Decoration>[] = [];

		syntaxTree(state).iterate({
			enter(node) {
				const headingLine = headingLines[node.name];
				if (headingLine) {
					ranges.push(headingLine.range(state.doc.lineAt(node.from).from));
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
