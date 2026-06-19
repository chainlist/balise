import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { makePlugin, hideMark, isRevealed, type MarkMode } from './shared';
import { UNDERLINE_SOURCE } from '../markdown-patterns';

const UNDERLINE_RE = new RegExp(UNDERLINE_SOURCE, 'g');

// Underline is stored as <u>text</u> or <ins>text</ins>. Render the inner text
// underlined and, unless the line is revealed, hide the surrounding tags.
// Mirrors highlightPlugin. Tag lengths vary (<u>/</u> vs <ins>/</ins>), so they
// are derived from the matched tag name in group 1.
function buildUnderlineDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		const { state } = view;
		const cursorLine = state.doc.lineAt(state.selection.main.head).number;
		const ranges: Range<Decoration>[] = [];

		for (const { from: vFrom, to: vTo } of view.visibleRanges) {
			UNDERLINE_RE.lastIndex = 0;
			const text = state.doc.sliceString(vFrom, vTo);
			let m: RegExpExecArray | null;
			while ((m = UNDERLINE_RE.exec(text)) !== null) {
				const from = vFrom + m.index;
				const to = from + m[0].length;
				const innerFrom = from + m[1].length + 2; // <tag>
				const innerTo = to - (m[1].length + 3); // </tag>

				if (!isRevealed(mode, state.doc.lineAt(from).number, cursorLine)) {
					ranges.push(hideMark.range(from, innerFrom));
					ranges.push(hideMark.range(innerTo, to));
				}
				ranges.push(Decoration.mark({ class: 'cm-md-underline' }).range(innerFrom, innerTo));
			}
		}

		ranges.sort((a, b) => a.from - b.from || b.to - a.to);
		return Decoration.set(ranges);
	};
}

export const mdUnderlinePlugin = (mode: MarkMode) => makePlugin(buildUnderlineDecos(mode));
