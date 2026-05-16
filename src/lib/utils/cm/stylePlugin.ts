import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin } from './shared';

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

	syntaxTree(view.state).iterate({
		enter(node) {
			const cls = STYLE_NODES[node.name];
			if (cls) ranges.push(Decoration.mark({ class: cls }).range(node.from, node.to));
		}
	});

	// Sort by start asc, end desc (outer ranges first). Skip nested overlaps.
	ranges.sort((a, b) => a.from - b.from || b.to - a.to);
	const deduped: Range<Decoration>[] = [];
	let lastTo = -1;
	for (const r of ranges) {
		if (r.from >= lastTo) {
			deduped.push(r);
			lastTo = r.to;
		}
	}

	return Decoration.set(deduped);
}

export const mdStylePlugin = makePlugin(buildStyleDecos);
