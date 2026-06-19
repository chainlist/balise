import { EditorView } from '@codemirror/view';

// When the user types the third backtick that completes a ``` fence on an
// otherwise-empty line, drop a matching closing ``` on the line below. The
// cursor stays right after the opening fence so a language can still be typed.
export const codeFenceAutoClose = EditorView.inputHandler.of((view, from, to, text) => {
	if (text !== '`' || from !== to) return false;
	const { state } = view;
	if (state.selection.ranges.length !== 1) return false;

	const line = state.doc.lineAt(from);
	// Two backticks (plus optional indentation) before the cursor; the typed one makes three.
	const indent = /^(\s*)``$/.exec(state.doc.sliceString(line.from, from))?.[1];
	if (indent === undefined) return false;
	// Only fire when nothing follows the cursor on this line.
	if (state.doc.sliceString(from, line.to).trim() !== '') return false;

	view.dispatch({
		changes: { from, insert: '`\n' + indent + '```' },
		selection: { anchor: from + 1 },
		userEvent: 'input.type',
		scrollIntoView: true
	});
	return true;
});
