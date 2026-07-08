import { describe, it, expect, afterEach } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { mountEditor, destroy, countEls, renderedLines } from './editor-harness';

// GFM table rendering: the block widget replaces the raw markdown when the
// cursor is outside, reveals it when inside, and reflects the two header
// conventions (all-empty header row = no header; fully-bold first column =
// header column) from table-model.ts.

let view: EditorView | null = null;
afterEach(() => {
	if (view) destroy(view);
	view = null;
});

function open(doc: string, cursor: number): EditorView {
	view = mountEditor(doc, { cursor });
	return view;
}

const TABLE = '| a | b |\n| --- | --- |\n| 1 | 2 |';

describe('table widget', () => {
	it('replaces the table lines with a rendered table when the cursor is outside', () => {
		const v = open(`text\n\n${TABLE}`, 0);
		expect(countEls(v, '.cm-md-table')).toBe(1);
		expect(countEls(v, '.cm-md-table th')).toBe(2);
		expect(countEls(v, '.cm-md-table td')).toBe(2);
		expect(renderedLines(v).join('\n')).not.toContain('| a | b |');
	});

	it('reveals the raw markdown when the cursor is inside the table', () => {
		const v = open(`text\n\n${TABLE}`, 8); // inside the header line
		expect(countEls(v, '.cm-md-table')).toBe(0);
		expect(renderedLines(v).join('\n')).toContain('| a | b |');
	});

	it('renders no header row when the header cells are all empty', () => {
		const v = open(`text\n\n|  |  |\n| --- | --- |\n| 1 | 2 |`, 0);
		expect(countEls(v, '.cm-md-table')).toBe(1);
		expect(countEls(v, '.cm-md-table thead')).toBe(0);
		expect(countEls(v, '.cm-md-table td')).toBe(2);
	});

	it('styles a fully-bold first column as a header column with markers stripped', () => {
		const v = open(`text\n\n| **a** | b |\n| --- | --- |\n| **x** | 1 |`, 0);
		expect(countEls(v, '.cm-md-table td.cm-md-table-colheader')).toBe(1);
		const cell = v.contentDOM.querySelector('.cm-md-table-colheader .cm-md-table-cell-rendered');
		expect(cell?.textContent).toBe('x');
		const head = v.contentDOM.querySelector('.cm-md-table th .cm-md-table-cell-rendered');
		expect(head?.textContent).toBe('a');
	});
});
