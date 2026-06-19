import { describe, it, expect, afterEach } from 'vitest';
import { keymap, type EditorView } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import {
	mountEditor,
	destroy,
	pressKey,
	rendered,
	cursor,
	docText,
	markPlugins
} from './editor-harness';

// Cursor navigation around concealed marks: arrows move by canonical (visual)
// positions and reveal/hide the marks as the cursor crosses an emphasis boundary,
// while the mark-nav keymap never breaks ordinary editing.

let view: EditorView | null = null;
afterEach(() => {
	if (view) destroy(view);
	view = null;
});

// Realistic nav stack: the mark plugins (incl. mdMarkNavPlugin) over the default
// keymap, exactly as the editor layers them.
function open(doc: string, start: number): EditorView {
	view = mountEditor(doc, {
		mode: 'cursor',
		cursor: start,
		extensions: [...markPlugins('cursor'), keymap.of(defaultKeymap)]
	});
	return view;
}

describe('arrow navigation', () => {
	it('reveals an emphasis as the cursor crosses into it, hides it on the way out', () => {
		const v = open('a **bold** b', 0);
		expect(rendered(v)).toBe('a bold b'); // cursor at 0, hidden

		pressKey(v, 'ArrowRight'); // -> 1, still outside [2,10]
		expect(cursor(v)).toBe(1);
		expect(rendered(v)).toBe('a bold b');

		pressKey(v, 'ArrowRight'); // -> 2, the node boundary reveals
		expect(cursor(v)).toBe(2);
		expect(rendered(v)).toBe('a **bold** b');
	});

	it('moves one canonical position per press and never mutates the doc', () => {
		const v = open('a *x* b', 1);
		const before = docText(v);
		const seen: number[] = [cursor(v)];
		for (let i = 0; i < 5; i++) {
			pressKey(v, 'ArrowRight');
			seen.push(cursor(v));
		}
		expect(seen).toEqual([1, 2, 3, 4, 5, 6]);
		expect(docText(v)).toBe(before); // navigation is non-destructive
	});

	it('arrows left symmetrically', () => {
		const v = open('a *x* b', 6);
		expect(rendered(v)).toBe('a x b');
		pressKey(v, 'ArrowLeft'); // -> 5, reveals (5 is parentTo of [2,5])
		expect(cursor(v)).toBe(5);
		expect(rendered(v)).toBe('a *x* b');
	});
});

describe('editing keys still work with the nav keymap layered on top', () => {
	it('Backspace deletes the previous character normally', () => {
		const v = open('**bold**', 4); // inside, revealed
		pressKey(v, 'Backspace');
		expect(docText(v)).toBe('**bld**');
		expect(cursor(v)).toBe(3);
	});

	it('Delete removes the next character normally', () => {
		const v = open('a **bold** b', 0);
		pressKey(v, 'Delete');
		expect(docText(v)).toBe(' **bold** b');
	});

	it('Backspace just outside a hidden emphasis deletes the adjacent plain char', () => {
		const v = open('a **bold** b', 11); // cursor before trailing " b", marks hidden
		pressKey(v, 'Backspace');
		expect(docText(v)).toBe('a **bold**b'); // removed the space at 10
	});
});
