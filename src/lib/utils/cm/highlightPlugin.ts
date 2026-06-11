import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { makePlugin, hideMark, isRevealed, type MarkMode } from './shared';
import { HIGHLIGHT_SOURCE } from '../markdown-patterns';

const HIGHLIGHT_RE = new RegExp(HIGHLIGHT_SOURCE, 'g');

function buildHighlightDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
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

				if (isRevealed(mode, state.doc.lineAt(from).number, cursorLine)) {
					ranges.push(Decoration.mark({ class: 'cm-md-highlight' }).range(from, to));
				} else {
					ranges.push(hideMark.range(from, innerFrom));
					ranges.push(Decoration.mark({ class: 'cm-md-highlight' }).range(innerFrom, innerTo));
					ranges.push(hideMark.range(innerTo, to));
				}
			}
		}

		ranges.sort((a, b) => a.from - b.from || b.to - a.to);
		return Decoration.set(ranges);
	};
}

export const mdHighlightPlugin = (mode: MarkMode) => makePlugin(buildHighlightDecos(mode));
