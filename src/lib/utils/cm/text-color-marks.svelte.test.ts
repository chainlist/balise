import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { mountEditor, destroy } from './editor-harness';
import { mdSyntaxHighlighting, noteEditorTheme } from './theme';
import { mdTextColorPlugin } from './textColorPlugin';
import { mdHidePlugin } from './hidePlugin';

// The italic decoration paints text in --primary. When a color span (rendered as
// the outer mark) wraps an italic, the explicit color must win over that accent.
// These tests wire the real syntax highlighting + theme so getComputedStyle sees
// the actual cascade (the plain concealment harness omits both).

const PRIMARY = 'rgb(124, 108, 222)';
const RED = 'rgb(255, 0, 0)';

let view: EditorView | null = null;
beforeAll(() => {
	document.documentElement.style.setProperty('--primary', PRIMARY);
	document.documentElement.style.setProperty('--foreground', 'rgb(0, 0, 0)');
});
afterEach(() => {
	if (view) destroy(view);
	view = null;
});

function colorOf(v: EditorView, word: string): string {
	const walker = document.createTreeWalker(v.contentDOM, NodeFilter.SHOW_TEXT);
	while (walker.nextNode()) {
		if (walker.currentNode.textContent === word) {
			return getComputedStyle((walker.currentNode as Text).parentElement as HTMLElement).color;
		}
	}
	throw new Error(`text "${word}" not rendered`);
}

function mount(doc: string): EditorView {
	view = mountEditor(doc, {
		mode: 'never',
		cursor: 0,
		extensions: [mdSyntaxHighlighting, mdHidePlugin('never'), mdTextColorPlugin(), noteEditorTheme]
	});
	return view;
}

describe('color overrides italic color', () => {
	it('renders a colored italic in the explicit color, not the italic accent', () => {
		expect(colorOf(mount('<span style="color: #ff0000">*word*</span>'), 'word')).toBe(RED);
	});

	it('leaves a plain italic in the accent color', () => {
		expect(colorOf(mount('*word*'), 'word')).toBe(PRIMARY);
	});
});
