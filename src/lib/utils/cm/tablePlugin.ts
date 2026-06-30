import { StateField } from '@codemirror/state';
import type { EditorState, Range } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { MarkMode } from './shared';

// GFM tables render as a styled, full-width HTML table (GitHub style) when the
// cursor is outside them. Like the other mark plugins they reveal their raw
// markdown for editing when the cursor lands inside (mode 'cursor') or always in
// mode 'always'. Block-level replace decorations must come from a StateField,
// not a ViewPlugin, so this mirrors codePlugin/embedPlugin's shape.

export type ColumnAlign = 'left' | 'center' | 'right' | null;
export type ParsedTable = { headers: string[]; align: ColumnAlign[]; rows: string[][] };

// Split one table row into trimmed cell strings. The outer pipes that wrap a row
// are delimiters, not cells, so they're stripped first; remaining pipes split the
// cells, with `\|` treated as a literal pipe inside a cell.
function splitRow(line: string): string[] {
	let s = line.trim();
	if (s.startsWith('|')) s = s.slice(1);
	if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);

	const cells: string[] = [];
	let cur = '';
	for (let i = 0; i < s.length; i++) {
		if (s[i] === '\\' && s[i + 1] === '|') {
			cur += '|';
			i++;
		} else if (s[i] === '|') {
			cells.push(cur);
			cur = '';
		} else {
			cur += s[i];
		}
	}
	cells.push(cur);
	return cells.map((c) => c.trim());
}

function parseAlign(spec: string): ColumnAlign {
	const s = spec.trim();
	const left = s.startsWith(':');
	const right = s.endsWith(':');
	if (left && right) return 'center';
	if (right) return 'right';
	if (left) return 'left';
	return null;
}

export function parseTable(source: string): ParsedTable | null {
	const lines = source.split('\n').filter((l) => l.trim() !== '');
	if (lines.length < 2) return null;
	const headers = splitRow(lines[0]);
	const align = splitRow(lines[1]).map(parseAlign);
	const rows = lines.slice(2).map(splitRow);
	return { headers, align, rows };
}

class TableWidget extends WidgetType {
	constructor(
		readonly source: string,
		readonly from: number
	) {
		super();
	}

	eq(other: TableWidget): boolean {
		return other.source === this.source;
	}

	toDOM(view: EditorView): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className = 'cm-md-table-wrap';

		const parsed = parseTable(this.source);
		if (!parsed) {
			wrap.textContent = this.source;
			return wrap;
		}

		const table = document.createElement('table');
		table.className = 'cm-md-table';

		const thead = document.createElement('thead');
		const headRow = document.createElement('tr');
		parsed.headers.forEach((text, i) => {
			const th = document.createElement('th');
			th.textContent = text;
			if (parsed.align[i]) th.style.textAlign = parsed.align[i] as string;
			headRow.appendChild(th);
		});
		thead.appendChild(headRow);
		table.appendChild(thead);

		const tbody = document.createElement('tbody');
		for (const row of parsed.rows) {
			const tr = document.createElement('tr');
			// Normalize to the header column count: pad short rows, drop overflow.
			for (let i = 0; i < parsed.headers.length; i++) {
				const td = document.createElement('td');
				td.textContent = row[i] ?? '';
				if (parsed.align[i]) td.style.textAlign = parsed.align[i] as string;
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}
		table.appendChild(tbody);
		wrap.appendChild(table);

		// Clicking the rendered table puts the cursor into its source so it reveals
		// for editing (mode 'cursor'). We handle the click ourselves and tell
		// CodeMirror to ignore the event (see ignoreEvent).
		wrap.addEventListener('mousedown', (e) => {
			e.preventDefault();
			view.dispatch({ selection: { anchor: this.from }, scrollIntoView: true });
			view.focus();
		});

		return wrap;
	}

	ignoreEvent(): boolean {
		return true;
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
				Decoration.replace({ widget: new TableWidget(source, from), block: true }).range(from, to)
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
