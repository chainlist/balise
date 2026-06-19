import { describe, it, expect, afterEach } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { mountEditor, destroy, setSelection, setCursor, pressKey, docText } from './editor-harness';
import { FORMAT_COMMANDS, activeMarks, mdFormatPlugin } from './formatPlugin';

// Toggle commands shared by the toolbar and the keymap: wrap a selection, unwrap
// existing marks (cursor-inside, marks-outside, marks-inside, content-of-node), and
// the bold-vs-italic delimiter guards.

let view: EditorView | null = null;
afterEach(() => {
	if (view) destroy(view);
	view = null;
});

function open(doc: string): EditorView {
	view = mountEditor(doc, { extensions: [mdFormatPlugin] });
	return view;
}

const sel = (v: EditorView) => [v.state.selection.main.from, v.state.selection.main.to];

describe('wrap selection', () => {
	it('bold wraps and keeps the selection around the text', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		FORMAT_COMMANDS.bold(v);
		expect(docText(v)).toBe('**word**');
		expect(sel(v)).toEqual([2, 6]);
	});

	it('italic wraps with single stars', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		FORMAT_COMMANDS.italic(v);
		expect(docText(v)).toBe('*word*');
	});

	it('strike wraps with ~~', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		FORMAT_COMMANDS.strike(v);
		expect(docText(v)).toBe('~~word~~');
	});

	it('underline wraps with <u> tags', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		FORMAT_COMMANDS.underline(v);
		expect(docText(v)).toBe('<u>word</u>');
	});
});

describe('unwrap existing marks', () => {
	it('bold toggled on an empty cursor inside the node removes the marks', () => {
		const v = open('**word**');
		setCursor(v, 4); // inside "word"
		FORMAT_COMMANDS.bold(v);
		expect(docText(v)).toBe('word');
	});

	it('italic round-trips: wrap then unwrap the same selection', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		FORMAT_COMMANDS.italic(v);
		expect(docText(v)).toBe('*word*');
		// selection now sits on the content of the Emphasis node
		FORMAT_COMMANDS.italic(v);
		expect(docText(v)).toBe('word');
	});

	it('bold unwraps when the marks sit just outside the selection', () => {
		const v = open('**word**');
		setSelection(v, 2, 6); // exactly the inner text
		FORMAT_COMMANDS.bold(v);
		expect(docText(v)).toBe('word');
	});

	it('underline toggles off an existing <u> wrap', () => {
		const v = open('<u>word</u>');
		setSelection(v, 3, 7); // inner text
		FORMAT_COMMANDS.underline(v);
		expect(docText(v)).toBe('word');
	});

	it('unwraps when the whole *…* (delimiters included) is selected', () => {
		const v = open('*hello*');
		setSelection(v, 0, 7); // the entire emphasis, marks included -> inner-marks path
		FORMAT_COMMANDS.italic(v);
		expect(docText(v)).toBe('hello');
	});

	it('unwraps an unparsed (trailing-space) emphasis via string adjacency', () => {
		const v = open('a *foo * b'); // the parser rejects this emphasis, no Emphasis node
		setSelection(v, 3, 7); // the inner "foo "
		FORMAT_COMMANDS.italic(v);
		expect(docText(v)).toBe('a foo  b');
	});
});

describe('bold / italic delimiter guards', () => {
	it('adding italic to the content of a bold node nests rather than eating a star', () => {
		const v = open('**word**');
		setSelection(v, 2, 6); // the inner "word"
		FORMAT_COMMANDS.italic(v);
		// must not strip a bold star; wraps with its own single stars
		expect(docText(v)).toBe('***word***');
	});
});

describe('empty selection insertion', () => {
	it('bold on an empty doc inserts the marks with the cursor between them', () => {
		const v = open('');
		setCursor(v, 0);
		FORMAT_COMMANDS.bold(v);
		expect(docText(v)).toBe('****');
		expect(view!.state.selection.main.head).toBe(2);
	});

	it('underline needs a selection — a bare cursor is a no-op', () => {
		const v = open('text');
		setCursor(v, 2);
		const handled = FORMAT_COMMANDS.underline(v);
		expect(handled).toBe(false);
		expect(docText(v)).toBe('text');
	});
});

describe('keymap', () => {
	it('Mod-b bolds the selection', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		pressKey(v, 'Mod-b');
		expect(docText(v)).toBe('**word**');
	});

	it('Mod-i italicises the selection', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		pressKey(v, 'Mod-i');
		expect(docText(v)).toBe('*word*');
	});

	it('Mod-u wraps the selection in <u> tags', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		pressKey(v, 'Mod-u');
		expect(docText(v)).toBe('<u>word</u>');
	});

	it('Mod-Shift-s strikes the selection', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		pressKey(v, 'Mod-Shift-s');
		expect(docText(v)).toBe('~~word~~');
	});

	it('Mod-Shift-h highlights the selection with = delimiters', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		pressKey(v, 'Mod-Shift-h');
		expect(docText(v)).toBe('=word=');
	});

	it('Mod-Shift-h on a bare cursor inside =word= removes the highlight', () => {
		const v = open('=word=');
		setCursor(v, 3); // inside "word"
		pressKey(v, 'Mod-Shift-h');
		expect(docText(v)).toBe('word');
	});
});

describe('activeMarks reports the marks wrapping the selection', () => {
	it('detects bold and italic, and reports none on plain text', () => {
		const v = open('**word**');
		setSelection(v, 2, 6);
		expect(activeMarks(v.state).bold).toBe(true);
		expect(activeMarks(v.state).italic).toBe(false);

		const v2 = mountEditor('plain', { extensions: [mdFormatPlugin] });
		setSelection(v2, 0, 5);
		expect(activeMarks(v2.state).bold).toBe(false);
		destroy(v2);
	});

	it('detects strike (tree) and underline (regex)', () => {
		const v = open('~~word~~');
		setSelection(v, 2, 6);
		expect(activeMarks(v.state).strike).toBe(true);

		const v2 = mountEditor('<u>word</u>', { extensions: [mdFormatPlugin] });
		setSelection(v2, 3, 7);
		expect(activeMarks(v2.state).underline).toBe(true);
		destroy(v2);
	});
});
