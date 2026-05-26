import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import {
	makePlugin,
	hideMark,
	LENIENT_EMPHASIS,
	dedupeOverlapping,
	isMarkRevealed,
	emphasisMarks,
	type MarkMode
} from './shared';

function buildHideDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		if (mode === 'always') return Decoration.none;

		const { state } = view;
		const cursorPos = state.selection.main.head;
		const ranges: Range<Decoration>[] = [];
		const parsedRanges: [number, number][] = [];

		// Tree pass: hide emphasis marks whose wrapping node doesn't have the cursor.
		for (const mark of emphasisMarks(state)) {
			parsedRanges.push([mark.parentFrom, mark.parentTo]);
			if (isMarkRevealed(mode, mark.parentFrom, mark.parentTo, cursorPos)) continue;
			ranges.push(hideMark.range(mark.from, mark.to));
		}

		// Regex fallback: hide marks for emphasis patterns the parser rejected (e.g. trailing spaces).
		const isCoveredByTree = (from: number, to: number) =>
			parsedRanges.some(([f, t]) => from >= f && to <= t);
		const lenientCovered: [number, number][] = [];

		for (const { from: vFrom, to: vTo } of view.visibleRanges) {
			const text = state.doc.sliceString(vFrom, vTo);
			for (const [re, , markLen] of LENIENT_EMPHASIS) {
				re.lastIndex = 0;
				let m: RegExpExecArray | null;
				while ((m = re.exec(text)) !== null) {
					const from = vFrom + m.index;
					const to = from + m[0].length;
					if (isCoveredByTree(from, to)) continue;
					if (lenientCovered.some(([f, t]) => from >= f && to <= t)) continue;
					lenientCovered.push([from, to]);

					if (isMarkRevealed(mode, from, to, cursorPos)) continue;
					ranges.push(hideMark.range(from, from + markLen));
					ranges.push(hideMark.range(to - markLen, to));
				}
			}
		}

		return Decoration.set(dedupeOverlapping(ranges));
	};
}

export const mdHidePlugin = (mode: MarkMode) => makePlugin(buildHideDecos(mode));
