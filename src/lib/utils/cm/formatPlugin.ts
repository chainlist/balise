import { keymap } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

const NODE_FOR_MARK: Record<string, string> = {
	'*': 'Emphasis',
	'**': 'StrongEmphasis',
	'~~': 'Strikethrough'
};

function toggleMark(view: EditorView, mark: string): boolean {
	const { state } = view;
	const targetNode = NODE_FOR_MARK[mark];
	const len = mark.length;

	view.dispatch(
		state.update(
			state.changeByRange((range) => {
				if (range.empty) {
					// Walk up the syntax tree to find if cursor is inside a matching node
					let node = syntaxTree(state).resolveInner(range.from, -1);
					while (node.parent) {
						if (node.name === targetNode) {
							return {
								changes: [
									{ from: node.from, to: node.from + len },
									{ from: node.to - len, to: node.to }
								],
								range: EditorSelection.cursor(range.from - len)
							};
						}
						node = node.parent;
					}
					return {
						changes: { from: range.from, insert: mark + mark },
						range: EditorSelection.cursor(range.from + len)
					};
				}

				// Marks are outside the selection: *[hello]*
				const before = state.doc.sliceString(range.from - len, range.from);
				const after = state.doc.sliceString(range.to, range.to + len);
				if (before === mark && after === mark) {
					return {
						changes: [
							{ from: range.from - len, to: range.from },
							{ from: range.to, to: range.to + len }
						],
						range: EditorSelection.range(range.anchor - len, range.head - len)
					};
				}

				// Marks are inside the selection: [*hello*]
				// Guard against matching a longer mark (e.g. ** when mark is *)
				const text = state.doc.sliceString(range.from, range.to);
				if (
					text.startsWith(mark) &&
					text.endsWith(mark) &&
					text.length > len * 2 &&
					text[len] !== mark[len - 1] &&
					text[text.length - len - 1] !== mark[0]
				) {
					const newFrom = range.from;
					const newTo = range.to - len * 2;
					return {
						changes: [
							{ from: range.from, to: range.from + len },
							{ from: range.to - len, to: range.to }
						],
						range: EditorSelection.range(
							range.anchor === range.from ? newFrom : newTo,
							range.head === range.from ? newFrom : newTo
						)
					};
				}

				// Wrap selection
				return {
					changes: [
						{ from: range.from, insert: mark },
						{ from: range.to, insert: mark }
					],
					range: EditorSelection.range(range.anchor + len, range.head + len)
				};
			}),
			{ userEvent: 'input' }
		)
	);
	return true;
}

export const mdFormatPlugin = keymap.of([
	{ key: 'Mod-b', run: (view) => toggleMark(view, '**') },
	{ key: 'Mod-i', run: (view) => toggleMark(view, '*') },
	{ key: 'Mod-Shift-s', run: (view) => toggleMark(view, '~~') }
]);
