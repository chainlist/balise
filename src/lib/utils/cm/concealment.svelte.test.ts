import { describe, it, expect, afterEach } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { mountEditor, destroy, rendered } from './editor-harness';
import type { MarkMode } from './shared';

// Concealment: what the user sees as the cursor moves, across mark modes. Covers the
// emphasis hide logic (incl. the adjacent-emphasis regression), highlight, underline,
// and ATX heading / blockquote mark hiding.

let view: EditorView | null = null;
afterEach(() => {
	if (view) destroy(view);
	view = null;
});

// Render `doc` with the cursor at `pos` in the given mode.
function at(doc: string, pos: number, mode: MarkMode = 'cursor'): string {
	view = mountEditor(doc, { mode, cursor: pos });
	const out = rendered(view);
	destroy(view);
	view = null;
	return out;
}

describe('emphasis concealment (cursor mode)', () => {
	it('reveals both delimiters when the cursor is inside, hides both when outside', () => {
		expect(at('a *italic* b', 0)).toBe('a italic b');
		expect(at('a *italic* b', 4)).toBe('a *italic* b');
		expect(at('a *italic* b', 12)).toBe('a italic b');
	});

	it('reveals bold symmetrically', () => {
		expect(at('a **bold** b', 0)).toBe('a bold b');
		expect(at('a **bold** b', 5)).toBe('a **bold** b');
		expect(at('a **bold** b', 12)).toBe('a bold b');
	});

	// Regression: the lenient fallback used to match the phantom span between two
	// adjacent emphases and clobber one delimiter of the one being revealed.
	it('does not clobber a delimiter when two emphases share a line', () => {
		// cursor inside the bold -> the bold shows BOTH closing stars
		expect(at('this **document** and *more*', 5)).toBe('this **document** and more');
		// cursor inside the italic -> italic fully revealed, bold hidden
		expect(at('this **document** and *more*', 23)).toBe('this document and *more*');
		// cursor outside both -> both hidden
		expect(at('this **document** and *more*', 0)).toBe('this document and more');
	});

	it('handles two bolds on one line without clobbering', () => {
		expect(at('**one** and **two**', 2)).toBe('**one** and two');
		expect(at('**one** and **two**', 14)).toBe('one and **two**');
		expect(at('**one** and **two**', 8)).toBe('one and two');
	});

	it('still conceals emphasis the parser rejects (trailing space) via the lenient path', () => {
		expect(at('a *foo * b', 0)).toBe('a foo  b');
		expect(at('a *foo * b', 3)).toBe('a *foo * b');
		expect(at('a **bar ** b', 0)).toBe('a bar  b');
	});

	it('strikethrough hides/reveals like other emphasis', () => {
		expect(at('a ~~gone~~ b', 0)).toBe('a gone b');
		expect(at('a ~~gone~~ b', 4)).toBe('a ~~gone~~ b');
	});

	it('hides/reveals underscore emphasis (_italic_, __bold__)', () => {
		expect(at('a _it_ b', 0)).toBe('a it b');
		expect(at('a _it_ b', 4)).toBe('a _it_ b');
		expect(at('a __bd__ b', 0)).toBe('a bd b');
	});
});

describe('highlight concealment (line-based: reveals on the cursor line)', () => {
	it('hides the single = delimiters off the line, reveals them on it', () => {
		// cursor on the highlight's line -> raw shown
		expect(at('a =hi= b\nx', 4)).toBe('a =hi= b\nx');
		// cursor on another line -> delimiters hidden
		expect(at('a =hi= b\nx', 9)).toBe('a hi b\nx');
	});
});

describe('underline concealment (line-based)', () => {
	it('hides <u> / <ins> tags off the line, reveals them on it', () => {
		expect(at('a <u>x</u> b\ny', 5)).toBe('a <u>x</u> b\ny');
		expect(at('a <u>x</u> b\ny', 13)).toBe('a x b\ny');
		expect(at('a <ins>z</ins> b\ny', 5)).toBe('a <ins>z</ins> b\ny');
		expect(at('a <ins>z</ins> b\ny', 17)).toBe('a z b\ny');
	});
});

describe('heading mark concealment', () => {
	it('hides the ATX marker off the line and shows it on the line', () => {
		expect(at('## Title\n\ntext', 0)).toBe('## Title\n\ntext');
		expect(at('## Title\n\ntext', 11)).toBe('Title\n\ntext');
	});
});

describe('blockquote mark concealment', () => {
	it('hides the > marker off the line and shows it on the line', () => {
		expect(at('> quoted\n\ntext', 0)).toBe('> quoted\n\ntext');
		expect(at('> quoted\n\ntext', 11)).toBe('quoted\n\ntext');
	});
});

describe('mode: always vs never', () => {
	it('always shows raw markdown regardless of cursor', () => {
		expect(at('a **bold** and =hi=', 0, 'always')).toBe('a **bold** and =hi=');
		expect(at('a **bold** and =hi=', 18, 'always')).toBe('a **bold** and =hi=');
	});

	it('never hides marks regardless of cursor', () => {
		expect(at('a **bold** and =hi=', 5, 'never')).toBe('a bold and hi');
		expect(at('## Title', 3, 'never')).toBe('Title');
	});
});
