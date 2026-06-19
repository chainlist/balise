import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type { Extension, Range } from '@codemirror/state';
import { makePlugin, hideMark } from './shared';
import { COLOR_SOURCE } from '../markdown-patterns';

const COLOR_RE = new RegExp(COLOR_SOURCE, 'g');

// Text color is stored as <span style="color: #hex">text</span>. Render the
// inner text in that color. Unlike the other marks, the wrapping tags are NEVER
// shown — independent of mark mode and cursor position — so the user only ever
// sees the colored text (color is added/removed through the toolbar, and
// markNavPlugin keeps these tags atomic so the cursor skips over them).
function buildColorDecos(view: EditorView): DecorationSet {
	const { state } = view;
	const ranges: Range<Decoration>[] = [];

	for (const { from: vFrom, to: vTo } of view.visibleRanges) {
		COLOR_RE.lastIndex = 0;
		const text = state.doc.sliceString(vFrom, vTo);
		let m: RegExpExecArray | null;
		while ((m = COLOR_RE.exec(text)) !== null) {
			const from = vFrom + m.index;
			const to = from + m[0].length;
			const openLen = m[0].length - m[2].length - 7; // ...">  /  </span> is 7
			const innerFrom = from + openLen;
			const innerTo = to - 7;

			ranges.push(hideMark.range(from, innerFrom));
			ranges.push(hideMark.range(innerTo, to));
			ranges.push(
				Decoration.mark({ attributes: { style: `color: ${m[1]}` } }).range(innerFrom, innerTo)
			);
		}
	}

	ranges.sort((a, b) => a.from - b.from || b.to - a.to);
	return Decoration.set(ranges);
}

// Concealment depends only on doc content and the viewport, not the cursor, so
// skip rebuilding on selection changes.
export const mdTextColorPlugin = () => makePlugin(buildColorDecos, { selection: false });

// Deleting all the text inside a color span leaves the wrapping tags behind: they
// are atomic, so the deletion never touches them. The COLOR regex requires
// non-empty inner text, so the orphaned <span style="color: …"></span> stops
// being concealed and shows up as raw HTML. Strip any empty color span a change
// produced, in the same transaction so a single undo restores the colored text.
const EMPTY_COLOR_SPAN_RE = /<span style="color:\s*[^"]+"><\/span>/g;

export const cleanEmptyColorSpans: Extension = EditorState.transactionFilter.of((tr) => {
	if (!tr.docChanged) return tr;
	const doc = tr.newDoc.toString();
	const changes: { from: number; to: number }[] = [];
	EMPTY_COLOR_SPAN_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = EMPTY_COLOR_SPAN_RE.exec(doc)) !== null) {
		changes.push({ from: m.index, to: m.index + m[0].length });
	}
	if (changes.length === 0) return tr;
	return [tr, { changes, sequential: true }];
});
