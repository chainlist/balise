// Pure GFM-table model: parse, serialize, and structural edits. Shared by the
// table editor component (MdTable.svelte) and the CodeMirror table plugin —
// no DOM, no CodeMirror.
//
// GFM has no syntax for "no header row" or "header column", so the two header
// toggles persist through plain markdown conventions instead:
// - header row OFF  → the header cells are all empty (`|  |  |`); toggling
//   moves the header contents into the first data row and back, so nothing is
//   lost and GitHub renders the same table with a blank header strip.
// - header column ON → every non-empty first-column cell (the header row's
//   first cell included) is bold-wrapped (`**cell**`). parseTable detects that
//   shape, strips the markers, and sets the flag; serializeTable re-adds them.
//   A first column with no content at all has nothing to mark, so the flag is
//   not representable there — MdTable carries it across rebuilds in-session.

export type ColumnAlign = 'left' | 'center' | 'right' | null;
export type ParsedTable = {
	headerRow: boolean;
	headerCol: boolean;
	headers: string[];
	align: ColumnAlign[];
	rows: string[][];
};

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

// The bold-marker-stripped text of a fully-bold cell, or null when the cell
// isn't one single bold span (e.g. `**a** and **b**` must not be treated as a
// header-column cell — stripping its outer markers would corrupt it).
function unbold(cell: string): string | null {
	const m = /^\*\*(.+)\*\*$/.exec(cell);
	if (!m) return null;
	const inner = m[1];
	if (inner.includes('**') || inner.startsWith('*') || inner.endsWith('*')) return null;
	return inner;
}

export function parseTable(source: string): ParsedTable | null {
	const lines = source.split('\n').filter((l) => l.trim() !== '');
	if (lines.length < 2) return null;
	const headers = splitRow(lines[0]);
	const align = splitRow(lines[1]).map(parseAlign);
	const rows = lines.slice(2).map(splitRow);

	const headerRow = headers.some((h) => h !== '');
	const firstCells = [...(headerRow ? [headers[0]] : []), ...rows.map((r) => r[0] ?? '')].filter(
		(c) => c !== ''
	);
	const headerCol = firstCells.length > 0 && firstCells.every((c) => unbold(c) !== null);
	if (headerCol) {
		if (headers[0]) headers[0] = unbold(headers[0])!;
		for (const r of rows) if (r[0]) r[0] = unbold(r[0])!;
	}

	return { headerRow, headerCol, headers, align, rows };
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
	const headerCells = t.headers.map(escapeCell);
	if (t.headerCol && headerCells[0] !== '') headerCells[0] = `**${headerCells[0]}**`;
	const header = `| ${headerCells.join(' | ')} |`;
	const delim = `| ${align.map(alignToken).join(' | ')} |`;
	const rows = t.rows.map((r) => {
		const cells = normRow(r, cols).map(escapeCell);
		if (t.headerCol && cells[0] !== '') cells[0] = `**${cells[0]}**`;
		return `| ${cells.join(' | ')} |`;
	});
	return [header, delim, ...rows].join('\n');
}

// Toggling the header row keeps content: demoting moves the header cells into a
// new first data row; promoting lifts the first data row into the header slot.
// Promoting is a no-op on a table with no data rows (there is nothing to lift).
export function withHeaderRowToggled(t: ParsedTable): ParsedTable {
	const cols = t.headers.length;
	if (t.headerRow) {
		return {
			headerRow: false,
			headerCol: t.headerCol,
			headers: new Array(cols).fill(''),
			align: t.align.slice(),
			rows: [t.headers.slice(), ...t.rows.map((r) => normRow(r, cols))]
		};
	}
	if (t.rows.length === 0) return t;
	const rows = t.rows.map((r) => normRow(r, cols));
	return {
		headerRow: true,
		headerCol: t.headerCol,
		headers: rows[0],
		align: t.align.slice(),
		rows: rows.slice(1)
	};
}

export function withHeaderColToggled(t: ParsedTable): ParsedTable {
	return {
		...t,
		headers: t.headers.slice(),
		align: t.align.slice(),
		rows: t.rows.map((r) => r.slice()),
		headerCol: !t.headerCol
	};
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
	return { ...t, headers, align, rows };
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
	return { ...t, headers, align, rows };
}

export function withRowInserted(t: ParsedTable, at: number): ParsedTable {
	const cols = t.headers.length;
	const rows = t.rows.map((r) => normRow(r, cols));
	rows.splice(at, 0, new Array(cols).fill(''));
	return { ...t, headers: t.headers.slice(), align: t.align.slice(), rows };
}

export function withRowRemoved(t: ParsedTable, at: number): ParsedTable {
	const cols = t.headers.length;
	const rows = t.rows.map((r) => normRow(r, cols));
	rows.splice(at, 1);
	return { ...t, headers: t.headers.slice(), align: t.align.slice(), rows };
}
