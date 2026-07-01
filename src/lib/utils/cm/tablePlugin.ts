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

function alignToken(a: ColumnAlign): string {
	switch (a) {
		case 'left':
			return ':---';
		case 'center':
			return ':---:';
		case 'right':
			return '---:';
		default:
			return '---';
	}
}

// Pipes are cell delimiters, so a literal pipe in cell text must be escaped on
// the way back to markdown (parseTable unescaped them).
const escapeCell = (s: string) => s.replace(/\|/g, '\\|');

// Normalize a possibly-ragged row to exactly `cols` cells.
const normRow = (row: string[], cols: number) =>
	Array.from({ length: cols }, (_, i) => row[i] ?? '');

// Serialize a parsed table back to GFM markdown. Spacing is normalized to single
// spaces around each cell, so a structural edit reformats the whole table.
export function serializeTable(t: ParsedTable): string {
	const cols = t.headers.length;
	const align = Array.from({ length: cols }, (_, i) => t.align[i] ?? null);
	const header = `| ${t.headers.map(escapeCell).join(' | ')} |`;
	const delim = `| ${align.map(alignToken).join(' | ')} |`;
	const rows = t.rows.map((r) => `| ${normRow(r, cols).map(escapeCell).join(' | ')} |`);
	return [header, delim, ...rows].join('\n');
}

export function withColumnInserted(t: ParsedTable, at: number): ParsedTable {
	const cols = t.headers.length;
	const headers = t.headers.slice();
	const align = Array.from({ length: cols }, (_, i) => t.align[i] ?? null);
	headers.splice(at, 0, '');
	align.splice(at, 0, null);
	const rows = t.rows.map((r) => {
		const c = normRow(r, cols);
		c.splice(at, 0, '');
		return c;
	});
	return { headers, align, rows };
}

export function withColumnRemoved(t: ParsedTable, at: number): ParsedTable {
	if (t.headers.length <= 1) return t;
	const cols = t.headers.length;
	const headers = t.headers.slice();
	const align = Array.from({ length: cols }, (_, i) => t.align[i] ?? null);
	headers.splice(at, 1);
	align.splice(at, 1);
	const rows = t.rows.map((r) => {
		const c = normRow(r, cols);
		c.splice(at, 1);
		return c;
	});
	return { headers, align, rows };
}

export function withRowInserted(t: ParsedTable, at: number): ParsedTable {
	const cols = t.headers.length;
	const rows = t.rows.map((r) => normRow(r, cols));
	rows.splice(at, 0, new Array(cols).fill(''));
	return { headers: t.headers.slice(), align: t.align.slice(), rows };
}

export function withRowRemoved(t: ParsedTable, at: number): ParsedTable {
	const cols = t.headers.length;
	const rows = t.rows.map((r) => normRow(r, cols));
	rows.splice(at, 1);
	return { headers: t.headers.slice(), align: t.align.slice(), rows };
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

		// The table scrolls horizontally inside `scroll`; the hover controls live on
		// `wrap` (overflow visible) so they can float just outside the table edges
		// without stealing layout width or being clipped.
		const scroll = document.createElement('div');
		scroll.className = 'cm-md-table-scroll';

		const table = document.createElement('table');
		table.className = 'cm-md-table';

		// One reference cell per column (header th) and per visual row (each row's
		// first cell, header included) — used to measure grid lines on hover.
		const colCells: HTMLElement[] = [];
		const rowCells: HTMLElement[] = [];

		// Each cell holds a textarea so its content can be edited in place and wraps
		// onto multiple lines instead of overflowing. A sizing pseudo-element on the
		// wrapper (fed `data-value`) mirrors the text so the row auto-grows in height
		// with no layout measurement (see `.cm-md-table-cell` in the theme).
		const makeCell = (tag: 'th' | 'td', text: string, align: ColumnAlign) => {
			const cell = document.createElement(tag);
			const grow = document.createElement('div');
			grow.className = 'cm-md-table-cell';
			grow.dataset.value = text;
			const area = document.createElement('textarea');
			area.className = 'cm-md-table-cell-input';
			area.rows = 1;
			area.cols = 1;
			area.value = text;
			if (align) area.style.textAlign = align;
			area.addEventListener('input', () => {
				grow.dataset.value = area.value;
			});
			area.addEventListener('keydown', (e) => {
				// Cells can't hold newlines (they'd break the row), so Enter commits and
				// leaves instead of inserting one; Escape just leaves. Commit happens
				// when focus leaves the table.
				if (e.key === 'Enter' || e.key === 'Escape') {
					e.preventDefault();
					area.blur();
				}
			});
			grow.appendChild(area);
			cell.appendChild(grow);
			return cell;
		};

		const thead = document.createElement('thead');
		const headRow = document.createElement('tr');
		parsed.headers.forEach((text, i) => {
			const th = makeCell('th', text, parsed.align[i]);
			headRow.appendChild(th);
			colCells.push(th);
		});
		thead.appendChild(headRow);
		table.appendChild(thead);
		rowCells.push(headRow.firstElementChild as HTMLElement);

		const tbody = document.createElement('tbody');
		for (const row of parsed.rows) {
			const tr = document.createElement('tr');
			// Normalize to the header column count: pad short rows, drop overflow.
			for (let i = 0; i < parsed.headers.length; i++) {
				tr.appendChild(makeCell('td', row[i] ?? '', parsed.align[i]));
			}
			tbody.appendChild(tr);
			rowCells.push(tr.firstElementChild as HTMLElement);
		}
		table.appendChild(tbody);
		scroll.appendChild(table);
		wrap.appendChild(scroll);

		// Read the live table contents back out of the inputs. Alignment isn't
		// editable inline, so it's carried over from the parsed source.
		const cellValue = (cell: Element) =>
			(cell.querySelector('textarea') as HTMLTextAreaElement).value.trim();
		const readDOM = (): ParsedTable => ({
			headers: colCells.map(cellValue),
			align: parsed.align.slice(),
			rows: Array.from(tbody.rows).map((tr) => Array.from(tr.cells).map(cellValue))
		});

		// Replace the table's source in the document. Editing the inputs doesn't move
		// the cursor (it stays outside the table), so the widget rebuilds in place.
		const dispatchMarkdown = (md: string) => {
			if (md === this.source) return;
			const to = this.from + this.source.length;
			view.dispatch({ changes: { from: this.from, to, insert: md } });
		};
		const commit = () => dispatchMarkdown(serializeTable(readDOM()));
		// Structural edits start from the live contents so in-progress text isn't lost.
		const structural = (mutate: (t: ParsedTable) => ParsedTable) =>
			dispatchMarkdown(serializeTable(mutate(readDOM())));

		const BTN = 16;
		let hoverCol = 0;
		let hoverRow = 0; // visual row: 0 = header, 1.. = data rows

		const makeBtn = (label: string, title: string, onActivate: () => void) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'cm-md-table-ctl';
			b.textContent = label;
			b.title = title;
			b.style.display = 'none';
			// preventDefault keeps focus on the active cell, so `structural` reads its
			// current text; stopPropagation keeps the click off the table below.
			b.addEventListener('mousedown', (e) => {
				e.preventDefault();
				e.stopPropagation();
				onActivate();
			});
			wrap.appendChild(b);
			return b;
		};

		const colPlusRight = makeBtn('+', 'Add column right', () =>
			structural((t) => withColumnInserted(t, hoverCol + 1))
		);
		const colPlusLeft = makeBtn('+', 'Add column left', () =>
			structural((t) => withColumnInserted(t, 0))
		);
		const colDel = makeBtn('×', 'Delete column', () =>
			structural((t) => withColumnRemoved(t, hoverCol))
		);
		const rowPlus = makeBtn('+', 'Add row below', () =>
			structural((t) => withRowInserted(t, hoverRow))
		);
		const rowDel = makeBtn('×', 'Delete row', () =>
			structural((t) => withRowRemoved(t, hoverRow - 1))
		);

		const place = (btn: HTMLElement, centerX: number, centerY: number) => {
			btn.style.left = `${centerX - BTN / 2}px`;
			btn.style.top = `${centerY - BTN / 2}px`;
			btn.style.display = 'flex';
		};

		const hideAll = () => {
			for (const b of [colPlusRight, colPlusLeft, colDel, rowPlus, rowDel])
				b.style.display = 'none';
		};

		// Geometry is measured relative to `wrap`. The controls sit just inside the
		// table edges (clamped to its bounds) rather than floating outside it: that
		// keeps them over the table so the pointer never leaves the widget to reach
		// them, and they stay clickable.
		const positionControls = () => {
			const wr = wrap.getBoundingClientRect();
			const tbl = table.getBoundingClientRect();
			const top = tbl.top - wr.top;
			const bottom = tbl.bottom - wr.top;
			const left = tbl.left - wr.left;
			const right = tbl.right - wr.left;
			const clampX = (x: number) => Math.max(left + BTN / 2, Math.min(x, right - BTN / 2));
			const clampY = (y: number) => Math.max(top + BTN / 2, Math.min(y, bottom - BTN / 2));
			const topStrip = top + BTN / 2 + 1; // inside the header
			const leftStrip = left + BTN / 2 + 1; // inside the first column

			const col = colCells[hoverCol].getBoundingClientRect();
			const colLeft = col.left - wr.left;
			const colRight = col.right - wr.left;

			const rowR = rowCells[hoverRow].getBoundingClientRect();
			const rowTop = rowR.top - wr.top;
			const rowBottom = rowR.bottom - wr.top;

			// Column inserts sit at the column's left/right grid lines along the top.
			place(colPlusRight, clampX(colRight), topStrip);
			if (hoverCol === 0) place(colPlusLeft, clampX(colLeft), topStrip);
			else colPlusLeft.style.display = 'none';
			// Delete sits at the top of the column (its start). The last column can't go.
			if (parsed.headers.length > 1) place(colDel, clampX((colLeft + colRight) / 2), topStrip);
			else colDel.style.display = 'none';

			// Row insert sits at the row's bottom grid line, on the left.
			place(rowPlus, leftStrip, clampY(rowBottom));
			// Delete sits at the start (left) of the row. The header row can't be deleted.
			if (hoverRow >= 1) place(rowDel, leftStrip, clampY((rowTop + rowBottom) / 2));
			else rowDel.style.display = 'none';
		};

		scroll.addEventListener('mousemove', (e) => {
			const wr = wrap.getBoundingClientRect();
			const x = e.clientX - wr.left;
			const y = e.clientY - wr.top;
			let c = 0;
			for (let i = 0; i < colCells.length; i++) {
				if (x >= colCells[i].getBoundingClientRect().left - wr.left) c = i;
				else break;
			}
			let r = 0;
			for (let i = 0; i < rowCells.length; i++) {
				if (y >= rowCells[i].getBoundingClientRect().top - wr.top) r = i;
				else break;
			}
			hoverCol = c;
			hoverRow = r;
			positionControls();
		});
		// Keep controls visible while the pointer is over them (they sit on `wrap`),
		// hiding only when it leaves the whole widget.
		wrap.addEventListener('mouseleave', hideAll);

		// Clicking a cell's padding (outside the textarea) still focuses it for editing.
		table.addEventListener('mousedown', (e) => {
			const target = e.target as HTMLElement;
			if (target.tagName === 'TEXTAREA') return;
			const area = target.closest('th,td')?.querySelector('textarea');
			if (area) {
				e.preventDefault();
				(area as HTMLTextAreaElement).focus();
			}
		});

		// Commit once focus leaves the table entirely (moving between cells doesn't).
		wrap.addEventListener('focusout', (e) => {
			const next = e.relatedTarget as Node | null;
			if (next && wrap.contains(next)) return;
			commit();
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
