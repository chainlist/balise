import { Decoration, EditorView, keymap } from '@codemirror/view';
import type { Command, DecorationSet } from '@codemirror/view';
import { EditorSelection, Prec, type Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin, hideMark, isRevealed, type MarkMode } from './shared';

const quoteLine = Decoration.line({ class: 'cm-md-quote' });

function buildQuoteDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		const { state } = view;
		const cursorLine = state.doc.lineAt(state.selection.main.head).number;
		const ranges: Range<Decoration>[] = [];
		const seenLines = new Set<number>();

		syntaxTree(state).iterate({
			enter(node) {
				// Style every line the blockquote spans (continuous left bar).
				if (node.name === 'Blockquote') {
					let pos = node.from;
					while (pos <= node.to) {
						const line = state.doc.lineAt(pos);
						if (!seenLines.has(line.number)) {
							seenLines.add(line.number);
							ranges.push(quoteLine.range(line.from));
						}
						pos = line.to + 1;
					}
					return;
				}

				// Hide the `>` mark (and its trailing space) unless the cursor reveals it.
				if (node.name === 'QuoteMark' && mode !== 'always') {
					const line = state.doc.lineAt(node.from);
					if (isRevealed(mode, line.number, cursorLine)) return;
					ranges.push(hideMark.range(node.from, Math.min(node.to + 1, line.to)));
				}
			}
		});

		return Decoration.set(ranges, true);
	};
}

export const mdQuotePlugin = (mode: MarkMode) => makePlugin(buildQuoteDecos(mode));

// On an empty quote line (only `>` marks and whitespace), Enter clears the
// markup and exits the blockquote in a single press. Upstream's
// insertNewlineContinueMarkup only exits after two aligned empty lines.
const exitEmptyBlockquote: Command = (view) => {
	const { state } = view;
	const range = state.selection.main;
	if (!range.empty) return false;

	const line = state.doc.lineAt(range.head);
	if (!/^\s*>[\s>]*$/.test(line.text)) return false;

	let inQuote = false;
	for (let n = syntaxTree(state).resolveInner(range.head, -1); n; n = n.parent) {
		if (n.name === 'Blockquote') {
			inQuote = true;
			break;
		}
		if (n.name === 'FencedCode' || n.name === 'CodeBlock') return false;
	}
	if (!inQuote) return false;

	view.dispatch(
		state.update({
			changes: { from: line.from, to: line.to },
			selection: EditorSelection.cursor(line.from),
			userEvent: 'delete'
		})
	);
	return true;
};

export const quoteExitKeymap = Prec.highest(keymap.of([{ key: 'Enter', run: exitEmptyBlockquote }]));
