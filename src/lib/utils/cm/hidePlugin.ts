import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import {
	makePlugin,
	hideMark,
	LENIENT_EMPHASIS,
	dedupeOverlapping,
	isMarkRevealed,
	type MarkMode
} from './shared';

const PARSED_EMPHASIS = new Set(['Emphasis', 'StrongEmphasis', 'Strikethrough', 'InlineCode']);

function buildHideDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		if (mode === 'always') return Decoration.none;

		const { state } = view;
		const cursorPos = state.selection.main.head;
		const ranges: Range<Decoration>[] = [];
		const parsedRanges: [number, number][] = [];

		// Tree pass: hide emphasis marks inside parser-recognized emphasis nodes.
		syntaxTree(state).iterate({
			enter(node) {
				const { from, to, name } = node;

				if (PARSED_EMPHASIS.has(name)) {
					parsedRanges.push([from, to]);
					return;
				}

				if (!name.endsWith('Mark')) return;
				// HeaderMark, ListMark, LinkMark etc. are handled by their own plugins.
				const parentName = node.node.parent?.name;
				if (!parentName || !PARSED_EMPHASIS.has(parentName)) return;

				const parent = node.node.parent!;
				if (isMarkRevealed(mode, parent.from, parent.to, cursorPos)) return;
				ranges.push(hideMark.range(from, to));
			}
		});

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
