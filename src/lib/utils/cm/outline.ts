import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export interface OutlineItem {
	/** Heading level, 1-6. */
	level: number;
	/** Heading text with the leading/trailing `#` marks stripped. */
	text: string;
	/** Document offset of the heading's start, for goToPosition. */
	from: number;
}

// ATXHeading1..6 and SetextHeading1..2 are the heading nodes Lezer produces.
const HEADING_NODE = /^(?:ATXHeading|SetextHeading)([1-6])$/;

// Strip the `#` marks from the first line. The AST already guarantees this is a
// heading, so the regexes only need to remove the markers, not validate.
function headingText(raw: string): string {
	const firstLine = raw.split('\n', 1)[0];
	return firstLine
		.replace(/^#{1,6}\s+/, '')
		.replace(/\s+#+\s*$/, '')
		.trim();
}

/**
 * Walk the markdown syntax tree and return every heading in document order.
 * Reading the AST (rather than regex-matching the text) means `#` lines inside
 * fenced code blocks or inline code are correctly ignored.
 */
export function getHeadingOutline(state: EditorState): OutlineItem[] {
	// ensureSyntaxTree forces a full parse so headings past the rendered
	// viewport are included; fall back to whatever is parsed if it times out.
	const tree = ensureSyntaxTree(state, state.doc.length, 5000) ?? syntaxTree(state);
	const items: OutlineItem[] = [];

	tree.iterate({
		enter(node) {
			const match = HEADING_NODE.exec(node.name);
			if (!match) return;
			items.push({
				level: Number(match[1]),
				text: headingText(state.doc.sliceString(node.from, node.to)),
				from: node.from
			});
		}
	});

	return items;
}
