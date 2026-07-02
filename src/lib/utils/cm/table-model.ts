// Pure GFM-table model: parse, serialize, and structural edits. Shared by the
// table editor component (MdTable.svelte) and the CodeMirror table plugin —
// no DOM, no CodeMirror.

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
