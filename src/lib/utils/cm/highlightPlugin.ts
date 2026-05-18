import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { makePlugin, hideMark } from './shared';

const HIGHLIGHT_RE = /=([^=\n]+)=/g;

function buildHighlightDecos(view: EditorView): DecorationSet {
	const { state } = view;
	const cursorLine = state.doc.lineAt(state.selection.main.head).number;
	const ranges: Range<Decoration>[] = [];

	for (const { from: vFrom, to: vTo } of view.visibleRanges) {
		HIGHLIGHT_RE.lastIndex = 0;
		const text = state.doc.sliceString(vFrom, vTo);
		let m: RegExpExecArray | null;
		while ((m = HIGHLIGHT_RE.exec(text)) !== null) {
			const from = vFrom + m.index;
			const to = from + m[0].length;
			const innerFrom = from + 1;
			const innerTo = to - 1;

			if (state.doc.lineAt(from).number === cursorLine) {
				// On the cursor line: keep the = signs visible, style the whole span
				ranges.push(Decoration.mark({ class: 'cm-md-highlight' }).range(from, to));
			} else {
				// Off the cursor line: hide the = signs, style only the inner text
				ranges.push(hideMark.range(from, innerFrom));
				ranges.push(Decoration.mark({ class: 'cm-md-highlight' }).range(innerFrom, innerTo));
				ranges.push(hideMark.range(innerTo, to));
			}
		}
	}

	ranges.sort((a, b) => a.from - b.from || b.to - a.to);
	return Decoration.set(ranges);
}

export const mdHighlightPlugin = makePlugin(buildHighlightDecos);
