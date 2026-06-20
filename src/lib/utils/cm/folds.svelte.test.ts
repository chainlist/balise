import { describe, it, expect, afterEach } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { codeFolding } from '@codemirror/language';
import { mountEditor, destroy, rendered, countEls } from './editor-harness';
import { restoreFolds } from './folds';

// restoreFolds re-applies persisted fold offsets against the *current* document.
// Stale offsets (content trimmed on save, or edited while the note was closed) must
// never produce a mid-text fold like "## Title … tail" — they get recomputed to the
// real section boundary or dropped entirely.

// `## Title` is line 1 (offsets 0..8); the body paragraph runs to offset 28.
const DOC = '## Title\n\nbody one two three\n';

let view: EditorView | null = null;
afterEach(() => {
	if (view) destroy(view);
	view = null;
});

describe('restoreFolds', () => {
	it('drops a fold whose start no longer sits on a foldable line', () => {
		// from=12 lands inside the body paragraph (content shifted since save).
		view = mountEditor(DOC, { extensions: [codeFolding()] });
		restoreFolds(view, [{ from: 12, to: 25 }]);
		expect(countEls(view, '.cm-foldPlaceholder')).toBe(0);
		expect(rendered(view)).toContain('body one two three');
	});

	it('recomputes the end so the whole current section folds, not the stale range', () => {
		// from is correct (end of heading line) but to=20 predates the section growing.
		view = mountEditor(DOC, { extensions: [codeFolding()] });
		restoreFolds(view, [{ from: 8, to: 20 }]);
		expect(countEls(view, '.cm-foldPlaceholder')).toBe(1);
		// No trailing tail leaks past the placeholder.
		expect(rendered(view)).not.toContain('three');
		expect(rendered(view)).not.toContain('body');
	});

	it('restores a still-valid fold', () => {
		view = mountEditor(DOC, { extensions: [codeFolding()] });
		restoreFolds(view, [{ from: 8, to: 28 }]);
		expect(countEls(view, '.cm-foldPlaceholder')).toBe(1);
		expect(rendered(view)).not.toContain('body');
	});
});
