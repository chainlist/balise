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

export function withColumnAligned(t: ParsedTable, at: number, align: ColumnAlign): ParsedTable {
	const cols = t.headers.length;
	const next = Array.from({ length: cols }, (_, i) => t.align[i] ?? null);
	next[at] = align;
	return { headers: t.headers.slice(), align: next, rows: t.rows.map((r) => r.slice()) };
}

// Cell to focus once a structural edit rebuilds the widget (visual row 0 = the
// header). Set right before dispatching; consumed by the next table toDOM (only
// the edited table redraws — unchanged sources are reused via eq()).
let pendingFocus: { col: number; row: number } | null = null;

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

		// Restore focus into the freshly rebuilt table after a structural edit.
		if (pendingFocus) {
			const pf = pendingFocus;
			pendingFocus = null;
			const tr = pf.row === 0 ? headRow : tbody.rows[Math.min(pf.row - 1, tbody.rows.length - 1)];
			const area = tr?.cells[Math.min(pf.col, tr.cells.length - 1)]?.querySelector('textarea');
			if (area) requestAnimationFrame(() => area.focus());
		}

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
		// After one dispatch this instance is stale (from/source no longer match the
		// doc), so further dispatches from it are dropped — e.g. the focusout commit
		// that fires when the rebuild detaches a focused cell.
		let dispatched = false;
		const dispatchMarkdown = (md: string) => {
			if (dispatched || md === this.source) return;
			dispatched = true;
			const to = this.from + this.source.length;
			view.dispatch({ changes: { from: this.from, to, insert: md } });
		};
		const commit = () => dispatchMarkdown(serializeTable(readDOM()));
		// Structural edits start from the live contents so in-progress text isn't lost.
		const structural = (mutate: (t: ParsedTable) => ParsedTable) =>
			dispatchMarkdown(serializeTable(mutate(readDOM())));

		const HANDLE = 16;
		let hoverCol = 0;
		let hoverRow = 0; // visual row: 0 = header, 1.. = data rows
		let menuOpen = false;

		// A popup menu shared by both handles, positioned against `wrap`. The handle
		// grips reveal on hover and open the menu with per-axis actions.
		const menu = document.createElement('div');
		menu.className = 'cm-md-table-menu';
		menu.style.display = 'none';
		wrap.appendChild(menu);

		const onDocDown = (e: MouseEvent) => {
			if (!menu.contains(e.target as Node)) closeMenu();
		};
		const onDocKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeMenu();
		};
		function closeMenu() {
			if (!menuOpen) return;
			menu.style.display = 'none';
			menuOpen = false;
			document.removeEventListener('mousedown', onDocDown, true);
			document.removeEventListener('keydown', onDocKey, true);
		}
		// Exposed so the widget can tear the listeners down if it's destroyed while open.
		(wrap as unknown as { _closeMenu?: () => void })._closeMenu = closeMenu;

		type MenuItem = 'sep' | { label: string; action: () => void };
		const openMenu = (items: MenuItem[], x: number, y: number) => {
			menu.replaceChildren();
			for (const item of items) {
				if (item === 'sep') {
					const sep = document.createElement('div');
					sep.className = 'cm-md-table-menu-sep';
					menu.appendChild(sep);
					continue;
				}
				const b = document.createElement('button');
				b.type = 'button';
				b.className = 'cm-md-table-menu-item';
				b.textContent = item.label;
				b.addEventListener('mousedown', (e) => {
					e.preventDefault();
					e.stopPropagation();
					const run = item.action;
					closeMenu();
					run();
				});
				menu.appendChild(b);
			}
			menu.style.left = `${x}px`;
			menu.style.top = `${y}px`;
			menu.style.display = 'block';
			menuOpen = true;
			document.addEventListener('mousedown', onDocDown, true);
			document.addEventListener('keydown', onDocKey, true);
		};

		// The handle menus carry the non-insert actions (insertion is done with the
		// boundary + buttons below, like the reference design).
		const columnItems = (): MenuItem[] => {
			const items: MenuItem[] = [
				{
					label: 'Align left',
					action: () => structural((t) => withColumnAligned(t, hoverCol, 'left'))
				},
				{
					label: 'Align center',
					action: () => structural((t) => withColumnAligned(t, hoverCol, 'center'))
				},
				{
					label: 'Align right',
					action: () => structural((t) => withColumnAligned(t, hoverCol, 'right'))
				}
			];
			if (parsed.headers.length > 1)
				items.push('sep', {
					label: 'Delete column',
					action: () => structural((t) => withColumnRemoved(t, hoverCol))
				});
			return items;
		};
		const rowItems = (): MenuItem[] => [
			{
				label: 'Delete row',
				action: () => structural((t) => withRowRemoved(t, hoverRow - 1))
			}
		];

		const makeHandle = (title: string, glyph: string, itemsFor: () => MenuItem[]) => {
			const h = document.createElement('button');
			h.type = 'button';
			h.className = 'cm-md-table-handle';
			h.title = title;
			h.textContent = glyph;
			h.style.display = 'none';
			h.addEventListener('mousedown', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (menuOpen) {
					closeMenu();
					return;
				}
				const wr = wrap.getBoundingClientRect();
				const hr = h.getBoundingClientRect();
				openMenu(itemsFor(), hr.left - wr.left, hr.bottom - wr.top + 2);
			});
			wrap.appendChild(h);
			return h;
		};
		const colHandle = makeHandle('Column options', '⌄', columnItems);
		const rowHandle = makeHandle('Row options', '⋮', rowItems);

		// Boundary insert affordance: hovering near a grid line shows a round + at
		// the boundary (top for columns, left for rows); hovering the + previews the
		// insertion point with a full-length accent line and a shortcut tooltip.
		const colInsert = document.createElement('button');
		colInsert.type = 'button';
		colInsert.className = 'cm-md-table-insert';
		// A drawn cross instead of a "+" glyph: text sits on a font baseline and is
		// not optically centered in the circle, while the SVG centers exactly.
		colInsert.innerHTML =
			'<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">' +
			'<path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
			'</svg>';
		colInsert.style.display = 'none';
		const rowInsert = colInsert.cloneNode(true) as HTMLButtonElement;
		const colLine = document.createElement('div');
		colLine.className = 'cm-md-table-insert-line';
		const rowLine = document.createElement('div');
		rowLine.className = 'cm-md-table-insert-line';
		const tip = document.createElement('div');
		tip.className = 'cm-md-table-tip';
		for (const el of [colInsert, rowInsert, colLine, rowLine, tip]) wrap.appendChild(el);

		let colBoundary = 0; // insert index for withColumnInserted
		let rowBoundary = 0; // insert index for withRowInserted
		let colBoundaryX = 0;
		let rowBoundaryY = 0;

		const tableRect = () => {
			const wr = wrap.getBoundingClientRect();
			const tbl = table.getBoundingClientRect();
			return {
				top: tbl.top - wr.top,
				bottom: tbl.bottom - wr.top,
				left: tbl.left - wr.left,
				right: tbl.right - wr.left,
				wr
			};
		};

		colInsert.addEventListener('mouseenter', () => {
			const t = tableRect();
			colLine.style.left = `${colBoundaryX - 1}px`;
			colLine.style.top = `${t.top}px`;
			colLine.style.width = '2px';
			colLine.style.height = `${t.bottom - t.top}px`;
			colLine.style.display = 'block';
			tip.textContent = 'Insert column  Ctrl+Alt+→';
			// Anchored by its bottom edge so it always clears the + button (top edge
			// of the button is at t.top - 8), whatever height the tip renders at.
			tip.style.left = `${colBoundaryX}px`;
			tip.style.top = `${t.top - 12}px`;
			tip.style.transform = 'translate(-50%, -100%)';
			tip.style.display = 'block';
		});
		colInsert.addEventListener('mouseleave', () => {
			colLine.style.display = 'none';
			tip.style.display = 'none';
		});
		rowInsert.addEventListener('mouseenter', () => {
			const t = tableRect();
			rowLine.style.left = `${t.left}px`;
			rowLine.style.top = `${rowBoundaryY - 1}px`;
			rowLine.style.width = `${t.right - t.left}px`;
			rowLine.style.height = '2px';
			rowLine.style.display = 'block';
			tip.textContent = 'Insert row  Ctrl+Alt+↓';
			// Bottom-anchored above the + button (button top is rowBoundaryY - 8),
			// shifted right so it doesn't cover the button either.
			tip.style.left = `${t.left + 12}px`;
			tip.style.top = `${rowBoundaryY - 12}px`;
			tip.style.transform = 'translateY(-100%)';
			tip.style.display = 'block';
		});
		rowInsert.addEventListener('mouseleave', () => {
			rowLine.style.display = 'none';
			tip.style.display = 'none';
		});

		colInsert.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			pendingFocus = { col: colBoundary, row: 0 };
			structural((t) => withColumnInserted(t, colBoundary));
		});
		rowInsert.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			pendingFocus = { col: 0, row: rowBoundary + 1 };
			structural((t) => withRowInserted(t, rowBoundary));
		});

		const SNAP = 9; // px distance from a grid line that reveals the + button
		const place = (btn: HTMLElement, centerX: number, centerY: number) => {
			btn.style.left = `${centerX - HANDLE / 2}px`;
			btn.style.top = `${centerY - HANDLE / 2}px`;
			btn.style.display = 'flex';
		};
		const hideAll = () => {
			for (const el of [colHandle, rowHandle, colInsert, rowInsert, colLine, rowLine, tip])
				el.style.display = 'none';
		};

		scroll.addEventListener('mousemove', (e) => {
			if (menuOpen) return;
			const t = tableRect();
			const x = e.clientX - t.wr.left;
			const y = e.clientY - t.wr.top;

			// Hovered column/row (for the handles).
			let c = 0;
			for (let i = 0; i < colCells.length; i++) {
				if (x >= colCells[i].getBoundingClientRect().left - t.wr.left) c = i;
				else break;
			}
			let r = 0;
			for (let i = 0; i < rowCells.length; i++) {
				if (y >= rowCells[i].getBoundingClientRect().top - t.wr.top) r = i;
				else break;
			}
			hoverCol = c;
			hoverRow = r;

			// Handles: column chevron at the top of the column, row grip at its left
			// (the header row has no row actions, so no handle there).
			const col = colCells[hoverCol].getBoundingClientRect();
			const colCenter = (col.left + col.right) / 2 - t.wr.left;
			place(colHandle, colCenter, t.top + HANDLE / 2 + 1);
			if (hoverRow >= 1) {
				const rowR = rowCells[hoverRow].getBoundingClientRect();
				place(rowHandle, t.left + HANDLE / 2 + 1, (rowR.top + rowR.bottom) / 2 - t.wr.top);
			} else rowHandle.style.display = 'none';

			// Nearest column boundary (grid lines incl. both outer edges).
			let bestC = -1;
			let bestCDist = SNAP + 1;
			for (let i = 0; i <= colCells.length; i++) {
				const bx =
					i < colCells.length ? colCells[i].getBoundingClientRect().left - t.wr.left : t.right;
				const d = Math.abs(x - bx);
				if (d < bestCDist) {
					bestCDist = d;
					bestC = i;
					colBoundaryX = bx;
				}
			}
			if (bestC >= 0) {
				colBoundary = bestC;
				place(colInsert, colBoundaryX, t.top);
			} else {
				colInsert.style.display = 'none';
			}

			// Nearest row boundary. Boundary above the header is skipped (a table
			// can't grow a row above its header), so boundaries start under it.
			let bestR = -1;
			let bestRDist = SNAP + 1;
			for (let i = 1; i <= rowCells.length; i++) {
				const by =
					i < rowCells.length ? rowCells[i].getBoundingClientRect().top - t.wr.top : t.bottom;
				const d = Math.abs(y - by);
				if (d < bestRDist) {
					bestRDist = d;
					bestR = i;
					rowBoundaryY = by;
				}
			}
			if (bestR >= 0) {
				rowBoundary = bestR - 1;
				place(rowInsert, t.left, rowBoundaryY);
			} else {
				rowInsert.style.display = 'none';
			}
		});
		// Keep controls visible while a menu is open; otherwise hide on leaving the widget.
		wrap.addEventListener('mouseleave', () => {
			if (!menuOpen) hideAll();
		});

		// Track the focused cell so the keyboard shortcuts know where to insert.
		let focusCol = 0;
		let focusRow = 0; // visual row: 0 = header
		wrap.addEventListener('focusin', (e) => {
			const cell = (e.target as HTMLElement).closest('th,td');
			if (!cell) return;
			const tr = cell.parentElement as HTMLTableRowElement;
			focusCol = Array.prototype.indexOf.call(tr.cells, cell);
			focusRow = tr.parentElement === tbody ? 1 + Array.prototype.indexOf.call(tbody.rows, tr) : 0;
		});
		// Ctrl+Alt+Arrow inserts a column/row next to the focused cell (as advertised
		// by the insert tooltips) and moves editing into the new cell.
		wrap.addEventListener('keydown', (e) => {
			if (!e.ctrlKey || !e.altKey) return;
			if (e.key === 'ArrowRight') {
				pendingFocus = { col: focusCol + 1, row: focusRow };
				structural((t) => withColumnInserted(t, focusCol + 1));
			} else if (e.key === 'ArrowLeft') {
				pendingFocus = { col: focusCol, row: focusRow };
				structural((t) => withColumnInserted(t, focusCol));
			} else if (e.key === 'ArrowDown') {
				pendingFocus = { col: focusCol, row: focusRow + 1 };
				structural((t) => withRowInserted(t, focusRow));
			} else if (e.key === 'ArrowUp' && focusRow >= 1) {
				pendingFocus = { col: focusCol, row: focusRow };
				structural((t) => withRowInserted(t, focusRow - 1));
			} else return;
			e.preventDefault();
			e.stopPropagation();
		});

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

	destroy(dom: HTMLElement): void {
		// If the menu was open when the widget is replaced, drop its document listeners.
		(dom as unknown as { _closeMenu?: () => void })._closeMenu?.();
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
