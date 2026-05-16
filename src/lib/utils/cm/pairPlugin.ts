import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

const PAIRS: Record<string, string> = { '*': '*', _: '_', '(': ')', '[': ']' };

export const mdPairPlugin = EditorView.inputHandler.of((view, _from, _to, text) => {
	const close = PAIRS[text];
	if (close === undefined) return false;

	const { state } = view;
	view.dispatch(
		state.update(
			state.changeByRange((range) => {
				if (!range.empty) {
					return {
						changes: [
							{ from: range.from, insert: text },
							{ from: range.to, insert: close }
						],
						range: EditorSelection.range(range.from + 1, range.to + 1)
					};
				}
				// Skip over existing closing char for asymmetric pairs
				if (text !== close && state.doc.sliceString(range.from, range.from + 1) === close) {
					return { range: EditorSelection.cursor(range.from + 1) };
				}
				return {
					changes: [{ from: range.from, to: range.to, insert: text + close }],
					range: EditorSelection.cursor(range.from + 1)
				};
			}),
			{ userEvent: 'input' }
		)
	);
	return true;
});
