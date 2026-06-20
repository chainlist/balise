import { describe, it, expect, afterEach } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { mountEditor, destroy, setSelection, setCursor, pressKey, docText } from './editor-harness';
import {
	FORMAT_COMMANDS,
	activeMarks,
	applyTextColor,
	activeTextColor,
	mdFormatPlugin
} from './formatPlugin';
import { cleanEmptyColorSpans } from './textColorPlugin';

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

	it('snaps to the whole mark when the selection straddles its boundary', () => {
		const v = open('*mary* another word');
		setSelection(v, 3, 13); // from inside "mary", across the closing *, into "another"
		FORMAT_COMMANDS.italic(v);
		expect(docText(v)).toBe('mary another word');
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

describe('text color', () => {
	it('wraps the selection in a color span', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		applyTextColor(v, '#7c6cde');
		expect(docText(v)).toBe('<span style="color: #7c6cde">word</span>');
		// selection stays around the inner text
		expect(sel(v)).toEqual([29, 33]);
	});

	it('replaces the color when the selection is already in a span', () => {
		const v = open('<span style="color: #7c6cde">word</span>');
		setSelection(v, 29, 33); // inner "word"
		applyTextColor(v, '#e87a6a');
		expect(docText(v)).toBe('<span style="color: #e87a6a">word</span>');
	});

	it('removes the span when the same color is applied again (toggle off)', () => {
		const v = open('<span style="color: #7c6cde">word</span>');
		setSelection(v, 29, 33);
		applyTextColor(v, '#7C6CDE'); // case-insensitive match
		expect(docText(v)).toBe('word');
		expect(sel(v)).toEqual([0, 4]);
	});

	it('splits the span when only part of a colored run is recolored', () => {
		const v = open('<span style="color: #ff00ff">A small colored text</span>');
		setSelection(v, 37, 44); // inner "colored" (innerFrom 29 + "A small " 8)
		applyTextColor(v, '#32ff32');
		expect(docText(v)).toBe(
			'<span style="color: #ff00ff">A small </span>' +
				'<span style="color: #32ff32">colored</span>' +
				'<span style="color: #ff00ff"> text</span>'
		);
		// selection stays around the recolored word
		expect(activeTextColor(v.state)).toBe('#32ff32');
		const [from, to] = sel(v);
		expect(docText(v).slice(from, to)).toBe('colored');
	});

	it('omits the empty side span when the partial selection sits at an edge', () => {
		const v = open('<span style="color: #ff00ff">colored text</span>');
		setSelection(v, 29, 36); // inner "colored" at the start of the run
		applyTextColor(v, '#32ff32');
		expect(docText(v)).toBe(
			'<span style="color: #32ff32">colored</span><span style="color: #ff00ff"> text</span>'
		);
	});

	it('leaves a partial selection unchanged when recolored to the parent color', () => {
		const v = open('<span style="color: #ff00ff">A small colored text</span>');
		setSelection(v, 37, 44);
		const handled = applyTextColor(v, '#FF00FF'); // same color, case-insensitive
		expect(handled).toBe(true);
		expect(docText(v)).toBe('<span style="color: #ff00ff">A small colored text</span>');
	});

	it('is a no-op on a bare cursor with no enclosing span', () => {
		const v = open('word');
		setCursor(v, 2);
		const handled = applyTextColor(v, '#7c6cde');
		expect(handled).toBe(false);
		expect(docText(v)).toBe('word');
	});

	// A selection that crosses a span boundary must produce flat sibling spans,
	// never a span nested inside another (the concealment regex can't parse
	// nesting, so nested spans leak raw <span> tags into the document).
	describe('recoloring across a span boundary stays flat', () => {
		it('recolors from inside a span out into plain text', () => {
			const v = open('<span style="color: #ff00ff">colored</span> text');
			setSelection(v, 33, 48); // from inside "colored" ("red") through " text"
			applyTextColor(v, '#32ff32');
			expect(docText(v)).toBe(
				'<span style="color: #ff00ff">colo</span>' + '<span style="color: #32ff32">red text</span>'
			);
			const [from, to] = sel(v);
			expect(docText(v).slice(from, to)).toBe('red text');
		});

		it('recolors from plain text into a span', () => {
			const v = open('plain <span style="color: #ff00ff">colored</span>');
			setSelection(v, 3, 39); // from "in" through part of "colored" ("colo")
			applyTextColor(v, '#32ff32');
			expect(docText(v)).toBe(
				'pla<span style="color: #32ff32">in colo</span>' + '<span style="color: #ff00ff">red</span>'
			);
		});

		it('recolors across two adjacent spans, absorbing the one between', () => {
			const v = open(
				'<span style="color: #ff00ff">aaa</span><span style="color: #00ff00">bbb</span>'
			);
			setSelection(v, 31, 70); // last "a" of the first span through "bb" of the second
			applyTextColor(v, '#0000ff');
			expect(docText(v)).toBe(
				'<span style="color: #ff00ff">aa</span>' +
					'<span style="color: #0000ff">abb</span>' +
					'<span style="color: #00ff00">b</span>'
			);
		});

		it('merges into an adjacent run when recolored to its color', () => {
			const v = open('<span style="color: #ff00ff">colored</span> text');
			setSelection(v, 33, 48); // "red" + " text"
			applyTextColor(v, '#ff00ff'); // same color as the run -> merge into one span
			expect(docText(v)).toBe('<span style="color: #ff00ff">colored text</span>');
		});
	});

	// Double-clicking a word inside a span selects the letters but not the mark's
	// concealed delimiters (e.g. "summary" inside <span>*summary*</span>). Those
	// delimiters belong to the word, so recoloring must treat the selection as
	// covering the whole span and keep the mark, not split the span and orphan the *.
	describe('recoloring a marked word inside a span keeps the mark', () => {
		it('recolors the whole span for italic delimiters', () => {
			const v = open('<span style="color: #6ecdb9">*summary*</span>');
			setSelection(v, 30, 37); // just "summary", not the asterisks
			applyTextColor(v, '#ff0000');
			expect(docText(v)).toBe('<span style="color: #ff0000">*summary*</span>');
		});

		it('recolors the whole span for bold delimiters', () => {
			const v = open('<span style="color: #6ecdb9">**summary**</span>');
			setSelection(v, 31, 38); // just "summary", not the **
			applyTextColor(v, '#ff0000');
			expect(docText(v)).toBe('<span style="color: #ff0000">**summary**</span>');
		});

		it('toggles the color off and leaves the bare mark', () => {
			const v = open('<span style="color: #6ecdb9">*summary*</span>');
			setSelection(v, 30, 37);
			applyTextColor(v, '#6ecdb9'); // same color -> remove the span
			expect(docText(v)).toBe('*summary*');
		});
	});

	it('activeTextColor reports the enclosing color, or null', () => {
		const v = open('<span style="color: #7c6cde">word</span>');
		setSelection(v, 29, 33);
		expect(activeTextColor(v.state)).toBe('#7c6cde');

		const v2 = mountEditor('plain', { extensions: [mdFormatPlugin] });
		setSelection(v2, 0, 5);
		expect(activeTextColor(v2.state)).toBeNull();
		destroy(v2);
	});
});

describe('empty color span cleanup', () => {
	it('removes the leftover span when the colored text is fully deleted', () => {
		view = mountEditor('a <span style="color: #e87a6a">x</span> b', {
			extensions: [cleanEmptyColorSpans]
		});
		const i = docText(view).indexOf('>x</span>') + 1; // position of the inner "x"
		view.dispatch({ changes: { from: i, to: i + 1 } }); // delete the inner text
		expect(docText(view)).toBe('a  b');
	});

	it('leaves a span with remaining text untouched', () => {
		view = mountEditor('<span style="color: #e87a6a">word</span>', {
			extensions: [cleanEmptyColorSpans]
		});
		view.dispatch({ changes: { from: 29, to: 30 } }); // delete the inner "w"
		expect(docText(view)).toBe('<span style="color: #e87a6a">ord</span>');
	});
});

describe('mixing color with other marks (nesting)', () => {
	it('underlines a colored selection, nesting <u> inside the span', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		applyTextColor(v, '#7c6cde');
		FORMAT_COMMANDS.underline(v);
		expect(docText(v)).toBe('<span style="color: #7c6cde"><u>word</u></span>');
		expect(activeMarks(v.state).underline).toBe(true);
		expect(activeTextColor(v.state)).toBe('#7c6cde');
	});

	it('toggles the underline back off, leaving the color span intact', () => {
		const v = open('word');
		setSelection(v, 0, 4);
		applyTextColor(v, '#7c6cde');
		FORMAT_COMMANDS.underline(v);
		FORMAT_COMMANDS.underline(v);
		expect(docText(v)).toBe('<span style="color: #7c6cde">word</span>');
	});

	it('colors an underlined selection, nesting the span inside <u>', () => {
		const v = open('<u>word</u>');
		setSelection(v, 3, 7); // inner "word"
		applyTextColor(v, '#7c6cde');
		expect(docText(v)).toBe('<u><span style="color: #7c6cde">word</span></u>');
		expect(activeMarks(v.state).underline).toBe(true);
		expect(activeTextColor(v.state)).toBe('#7c6cde');
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
