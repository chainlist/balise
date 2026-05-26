import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin, LENIENT_EMPHASIS, dedupeOverlapping } from './shared';

const STYLE_NODES: Record<string, string> = {
	StrongEmphasis: 'cm-md-bold',
	Emphasis: 'cm-md-italic',
	InlineCode: 'cm-md-code',
	Strikethrough: 'cm-md-strike',
	ATXHeading1: 'cm-md-h1',
	ATXHeading2: 'cm-md-h2',
	ATXHeading3: 'cm-md-h3'
};

function buildStyleDecos(view: EditorView): DecorationSet {
	const ranges: Range<Decoration>[] = [];
	const covered: [number, number][] = [];
	const isCovered = (from: number, to: number) => covered.some(([f, t]) => from >= f && to <= t);

	syntaxTree(view.state).iterate({
		enter(node) {
			const cls = STYLE_NODES[node.name];
			if (cls) {
				ranges.push(Decoration.mark({ class: cls }).range(node.from, node.to));
				covered.push([node.from, node.to]);
			}
		}
	});

	for (const { from: vFrom, to: vTo } of view.visibleRanges) {
		const text = view.state.doc.sliceString(vFrom, vTo);
		for (const [re, cls] of LENIENT_EMPHASIS) {
			re.lastIndex = 0;
			let m: RegExpExecArray | null;
			while ((m = re.exec(text)) !== null) {
				const from = vFrom + m.index;
				const to = from + m[0].length;
				if (!isCovered(from, to)) {
					ranges.push(Decoration.mark({ class: cls }).range(from, to));
					covered.push([from, to]);
				}
			}
		}
	}

	return Decoration.set(dedupeOverlapping(ranges));
}

// Styling doesn't depend on cursor position - skip selectionSet rebuilds.
export const mdStylePlugin = makePlugin(buildStyleDecos, { selection: false });
