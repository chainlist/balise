import { StateField } from '@codemirror/state';
import type { EditorState, Range } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import MdTable from '$lib/components/cm/MdTable.svelte';
import { SvelteWidget } from './shared';
import type { MarkMode } from './shared';

// GFM tables render as a styled, full-width HTML table (GitHub style) when the
// cursor is outside them. Like the other mark plugins they reveal their raw
// markdown for editing when the cursor lands inside (mode 'cursor') or always in
// mode 'always'. Block-level replace decorations must come from a StateField,
// not a ViewPlugin, so this mirrors codePlugin/embedPlugin's shape. The table UI
// itself (cells, hover controls, menus) is MdTable.svelte.

type TableProps = { source: string; commit: (md: string) => void };

// Positions captured at widget build time go stale as the doc changes (the
// widget DOM is reused via eq() while text shifts around it), so a commit
// re-resolves the table's range from the widget's live DOM position, like
// embedPlugin's actions do.
function tableRange(state: EditorState, pos: number): { from: number; to: number } | null {
	let range: { from: number; to: number } | null = null;
	syntaxTree(state).iterate({
		from: pos,
		to: Math.min(pos + 1, state.doc.length),
		enter(node) {
			if (node.name !== 'Table') return;
			range = { from: state.doc.lineAt(node.from).from, to: state.doc.lineAt(node.to).to };
			return false;
		}
	});
	return range;
}

class TableWidget extends SvelteWidget<TableProps> {
	protected component = MdTable;
	protected tagName = 'div' as const;
	#el: HTMLElement | null = null;

	constructor(readonly source: string) {
		super();
	}

	protected setup(el: HTMLElement) {
		this.#el = el;
	}

	protected getProps(view: EditorView): TableProps {
		return {
			source: this.source,
			commit: (md: string) => {
				// After a structural edit rebuilds the widget, the old instance's
				// focusout commit can still fire — its detached DOM makes it a no-op.
				if (!this.#el?.isConnected) return;
				const range = tableRange(view.state, view.posAtDOM(this.#el));
				if (!range) return;
				if (md === view.state.doc.sliceString(range.from, range.to)) return;
				view.dispatch({ changes: { from: range.from, to: range.to, insert: md } });
			}
		};
	}

	eq(other: TableWidget): boolean {
		return other.source === this.source;
	}
}

function buildDecos(state: EditorState, mode: MarkMode): DecorationSet {
	if (mode === 'always') return Decoration.none;

	const ranges: Range<Decoration>[] = [];
	const cursorLine = state.doc.lineAt(state.selection.main.head).number;

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'Table') return;

			const from = state.doc.lineAt(node.from).from;
			const to = state.doc.lineAt(node.to).to;

			if (mode === 'cursor') {
				const startLine = state.doc.lineAt(from).number;
				const endLine = state.doc.lineAt(to).number;
				if (cursorLine >= startLine && cursorLine <= endLine) return false;
			}

			const source = state.doc.sliceString(from, to);
			ranges.push(
				Decoration.replace({ widget: new TableWidget(source), block: true }).range(from, to)
			);
			return false;
		}
	});

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

export const mdTablePlugin = (mode: MarkMode) =>
	StateField.define<DecorationSet>({
		create(state) {
			return buildDecos(state, mode);
		},
		update(decos, tr) {
			// Rebuild on edits, selection moves (reveal), and lazy parse advances
			// (a table past the initial parse window — see embedPlugin's note).
			if (tr.docChanged || tr.selection || syntaxTree(tr.startState) != syntaxTree(tr.state)) {
				return buildDecos(tr.state, mode);
			}
			return decos.map(tr.changes);
		},
		provide(field) {
			return EditorView.decorations.from(field);
		}
	});
