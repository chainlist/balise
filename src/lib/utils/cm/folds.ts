import type { EditorView } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { foldedRanges, foldEffect, foldable, forceParsing } from '@codemirror/language';

export type FoldRange = { from: number; to: number };

/** Snapshot the currently folded ranges, in document order. */
export function readFolds(state: EditorState): FoldRange[] {
	const folds: FoldRange[] = [];
	foldedRanges(state).between(0, state.doc.length, (from, to) => {
		folds.push({ from, to });
	});
	return folds;
}

/** Re-apply saved folds, recomputing each range against the current document so a
 *  fold still lands on a real section boundary even when the note changed while it
 *  was closed (a synced edit, or trailing whitespace trimmed on save). A fold whose
 *  start no longer sits at a foldable line is dropped rather than folded mid-text. */
export function restoreFolds(view: EditorView, folds: FoldRange[]): void {
	if (!folds.length) return;
	// Folding reads the syntax tree, which parses lazily; force it across the whole
	// note so sections below the initial viewport are foldable too.
	forceParsing(view, view.state.doc.length, 150);
	const { state } = view;
	const max = state.doc.length;
	const valid: FoldRange[] = [];
	for (const f of folds) {
		if (f.from < 0 || f.to > max || f.from >= f.to) continue;
		// A fold starts at the end of its heading (or block) line. If the saved
		// offset no longer lands there, the content shifted — skip it.
		const line = state.doc.lineAt(f.from);
		if (f.from !== line.to) continue;
		// Re-fold the freshly computed range so the end tracks a section whose
		// length changed since the fold was saved.
		const range = foldable(state, line.from, line.to);
		if (range && range.from === f.from) valid.push(range);
	}
	if (valid.length) view.dispatch({ effects: valid.map((f) => foldEffect.of(f)) });
}

const CHEVRON =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
const CHEVRON_DOWN = `${CHEVRON}<path d="m6 9 6 6 6-6"/></svg>`;
const CHEVRON_RIGHT = `${CHEVRON}<path d="m9 18 6-6-6-6"/></svg>`;

/** Fold-gutter marker: a chevron pointing down when the section is open (click
 *  to fold) and right when folded (click to unfold). Classes drive sizing,
 *  alignment, and always-on visibility of folded markers (see theme.ts). */
export function foldMarkerDOM(open: boolean): HTMLElement {
	const span = document.createElement('span');
	span.className = open
		? 'cm-fold-marker cm-fold-marker-open'
		: 'cm-fold-marker cm-fold-marker-closed';
	span.setAttribute('aria-hidden', 'true');
	span.innerHTML = open ? CHEVRON_DOWN : CHEVRON_RIGHT;
	return span;
}
