import { describe, it, expect, afterEach } from 'vitest';
import { keymap, type EditorView } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import {
	mountEditor,
	destroy,
	renderedLines,
	lineClasses,
	countEls,
	docText,
	pressKey,
	markPlugins
} from './editor-harness';
import { mdPlaceholderPlugin } from './placeholderPlugin';
import { quoteExitKeymap } from './quotePlugin';
import type { MarkMode } from './shared';

// Block-level rendering: heading/quote line decorations, bullet & HR widgets, fenced
// code block line classes and fence reveal, the empty-blockquote Enter escape, and the
// empty-line placeholder.

let view: EditorView | null = null;
afterEach(() => {
	if (view) destroy(view);
	view = null;
});

function open(doc: string, cursor: number, mode: MarkMode = 'cursor'): EditorView {
	view = mountEditor(doc, { mode, cursor });
	return view;
}

describe('headings', () => {
	it('marks an H1 line with cm-md-h1-line and hides the # marker off the line', () => {
		const v = open('# Title\n\nbody', 10); // cursor on line 3
		expect(lineClasses(v, 1)).toContain('cm-md-h1-line');
		expect(renderedLines(v)[0]).toBe('Title'); // "# " hidden
	});

	it('hides the H2 marker off the line, no h1 line class', () => {
		const v = open('## Title\n\nbody', 11);
		expect(lineClasses(v, 1)).not.toContain('cm-md-h1-line');
		expect(renderedLines(v)[0]).toBe('Title');
	});

	it('shows the marker again when the cursor is on the heading line', () => {
		const v = open('## Title\n\nbody', 0);
		expect(renderedLines(v)[0]).toBe('## Title');
	});
});

describe('blockquote', () => {
	it('decorates the quote line and hides the > marker off the line', () => {
		const v = open('> hi\n\nbody', 8);
		expect(lineClasses(v, 1)).toContain('cm-md-quote');
		expect(renderedLines(v)[0]).toBe('hi');
	});

	it('shows the > marker when the cursor is on the quote line', () => {
		const v = open('> hi\n\nbody', 0);
		expect(renderedLines(v)[0]).toBe('> hi');
	});
});

describe('bullets', () => {
	it('replaces list markers with a bullet glyph', () => {
		const v = open('- one\n- two', 0);
		expect(renderedLines(v)).toEqual(['• one', '• two']);
		expect(countEls(v, '.cm-md-bullet')).toBe(2);
	});

	it('leaves raw markers in always mode', () => {
		const v = open('- one\n- two', 0, 'always');
		expect(renderedLines(v)).toEqual(['- one', '- two']);
		expect(countEls(v, '.cm-md-bullet')).toBe(0);
	});
});

describe('horizontal rule', () => {
	it('renders an hr widget when the cursor is off the line', () => {
		const v = open('---\n\nbody', 6);
		expect(countEls(v, '.cm-md-hr')).toBe(1);
		expect(renderedLines(v)[0]).toBe('');
	});

	it('shows the raw --- when the cursor is on the line', () => {
		const v = open('---\n\nbody', 0);
		expect(countEls(v, '.cm-md-hr')).toBe(0);
		expect(renderedLines(v)[0]).toBe('---');
	});
});

describe('fenced code block', () => {
	it('classes every line and reveals the fences when the cursor is inside', () => {
		const v = open('```js\ncode\n```', 7); // cursor on the "code" line
		expect(lineClasses(v, 1)).toEqual(
			expect.arrayContaining(['cm-md-codeblock', 'cm-md-codeblock-begin'])
		);
		expect(lineClasses(v, 2)).toContain('cm-md-codeblock');
		expect(lineClasses(v, 3)).toEqual(
			expect.arrayContaining(['cm-md-codeblock', 'cm-md-codeblock-end'])
		);
		expect(renderedLines(v)).toEqual(['```js', 'code', '```']);
	});

	it('hides the fence lines when the cursor is outside the block', () => {
		const v = open('```js\ncode\n```\n\nx', 16); // cursor on the trailing "x" line
		const lines = renderedLines(v);
		expect(lines[0]).toBe(''); // opening fence concealed
		expect(lines[1]).toBe('code');
		expect(lines[2]).toBe(''); // closing fence concealed
		expect(lineClasses(v, 1)).toContain('cm-md-codeblock-begin');
	});
});

describe('empty-blockquote escape (quoteExitKeymap)', () => {
	it('clears an empty "> " line on Enter and exits the quote', () => {
		view = mountEditor('> ', {
			mode: 'cursor',
			cursor: 2,
			extensions: [...markPlugins('cursor'), quoteExitKeymap, keymap.of(defaultKeymap)]
		});
		pressKey(view, 'Enter');
		expect(docText(view)).toBe('');
	});
});

describe('placeholder', () => {
	function withPlaceholder(doc: string, cursor: number): EditorView {
		view = mountEditor(doc, {
			mode: 'cursor',
			cursor,
			extensions: [...markPlugins('cursor'), mdPlaceholderPlugin]
		});
		return view;
	}
	const ph = (v: EditorView, line: number) =>
		v.contentDOM.querySelectorAll('.cm-line')[line - 1]?.getAttribute('data-placeholder');

	it('sets a placeholder on an empty document line', () => {
		const v = withPlaceholder('', 0);
		expect(ph(v, 1)).toBeTruthy();
	});

	it('removes the placeholder once the line has content', () => {
		const v = withPlaceholder('hello', 5);
		expect(ph(v, 1)).toBeNull();
	});

	it('does not place a placeholder on an empty line inside a code block', () => {
		const v = withPlaceholder('```\n\n```', 4); // empty middle line of the fence
		expect(ph(v, 2)).toBeNull();
	});
});
