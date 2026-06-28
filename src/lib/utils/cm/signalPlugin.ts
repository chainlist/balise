import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import SignalHeader from '$lib/components/cm/SignalHeader.svelte';
import { signalType, type SignalType } from '../markdown-patterns';
import { makePlugin, hideMark, isRevealed, SvelteWidget, type MarkMode } from './shared';

// The header that replaces the `> [!NOTE]` marker line: the type label on the left,
// the icon in the block's top-right corner. A `div` host gives it full line width so
// the flex layout can push the icon to the right edge.
class SignalHeaderWidget extends SvelteWidget<{ type: SignalType }> {
	protected component = SignalHeader;
	protected override tagName = 'div' as const;
	constructor(readonly type: SignalType) {
		super();
	}
	protected getProps() {
		return { type: this.type };
	}
	eq(other: SignalHeaderWidget) {
		return other.type === this.type;
	}
}

// Strip the leading `> ` (one optional trailing space) on a body line.
const QUOTE_PREFIX_RE = /^\s*>\s?/;

function buildSignalDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		const { state } = view;
		const cursorLine = state.doc.lineAt(state.selection.main.head).number;
		const ranges: Range<Decoration>[] = [];
		const seenLines = new Set<number>();

		syntaxTree(state).iterate({
			enter(node) {
				if (node.name !== 'Blockquote') return;
				const firstLine = state.doc.lineAt(node.from);
				const type = signalType(firstLine.text);
				if (!type) return; // a plain blockquote — leave it to the quote plugin

				let pos = node.from;
				while (pos <= node.to) {
					const line = state.doc.lineAt(pos);
					if (seenLines.has(line.number)) {
						pos = line.to + 1;
						continue;
					}
					seenLines.add(line.number);

					const isFirst = line.number === firstLine.number;
					const isLast = node.to <= line.to;
					const revealed = isRevealed(mode, line.number, cursorLine);
					const cls = ['cm-md-signal', `cm-md-signal-${type}`];
					if (isFirst) cls.push('cm-md-signal-first');
					if (isLast) cls.push('cm-md-signal-last');
					// Concealed header collapses to the label's own height so the body
					// sits right beneath it (no full line-height gap).
					if (isFirst && !revealed) cls.push('cm-md-signal-marker');
					ranges.push(Decoration.line({ class: cls.join(' ') }).range(line.from));

					if (isFirst) {
						// Off-cursor, swap the whole `> [!NOTE]` line for the icon + label
						// header. On the cursor's line, show the raw marker for editing.
						if (!revealed && line.to > line.from) {
							ranges.push(
								Decoration.replace({ widget: new SignalHeaderWidget(type) }).range(
									line.from,
									line.to
								)
							);
						}
					} else if (!revealed) {
						const m = QUOTE_PREFIX_RE.exec(line.text);
						if (m) ranges.push(hideMark.range(line.from, line.from + m[0].length));
					}

					pos = line.to + 1;
				}
			}
		});

		return Decoration.set(ranges, true);
	};
}

export const mdSignalPlugin = (mode: MarkMode) => makePlugin(buildSignalDecos(mode));
