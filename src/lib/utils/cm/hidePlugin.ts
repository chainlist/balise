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

// Tree pass: hide emphasis marks whose wrapping node doesn't contain the cursor.
// Returns the ranges added and the parsed parent intervals (used as exclusion set below).
function collectParsedHideRanges(
	view: EditorView,
	mode: MarkMode,
	cursorPos: number
): { ranges: Range<Decoration>[]; parsedIntervals: [number, number][] } {
	const ranges: Range<Decoration>[] = [];
	const parsedIntervals: [number, number][] = [];
	for (const mark of emphasisMarks(view.state)) {
		parsedIntervals.push([mark.parentFrom, mark.parentTo]);
		if (isMarkRevealed(mode, mark.parentFrom, mark.parentTo, cursorPos)) continue;
		ranges.push(hideMark.range(mark.from, mark.to));
	}
	return { ranges, parsedIntervals };
}

// Regex fallback: hide marks for emphasis patterns the parser rejected (e.g. trailing spaces).
// Skips any range already covered by the syntax tree or a previous lenient match.
function collectLenientHideRanges(
	view: EditorView,
	mode: MarkMode,
	cursorPos: number,
	parsedIntervals: [number, number][]
): Range<Decoration>[] {
	const ranges: Range<Decoration>[] = [];
	const isCoveredByTree = (from: number, to: number) =>
		parsedIntervals.some(([f, t]) => from >= f && to <= t);
	const lenientCovered: [number, number][] = [];

	for (const { from: vFrom, to: vTo } of view.visibleRanges) {
		const text = view.state.doc.sliceString(vFrom, vTo);
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
	return ranges;
}

function buildHideDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		if (mode === 'always') return Decoration.none;
		const cursorPos = view.state.selection.main.head;
		const { ranges: parsedRanges, parsedIntervals } = collectParsedHideRanges(view, mode, cursorPos);
		const lenientRanges = collectLenientHideRanges(view, mode, cursorPos, parsedIntervals);
		return Decoration.set(dedupeOverlapping([...parsedRanges, ...lenientRanges]));
	};
}

export const mdHidePlugin = (mode: MarkMode) => makePlugin(buildHideDecos(mode));
