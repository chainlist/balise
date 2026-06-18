import type { EditorView } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { foldedRanges, foldEffect } from '@codemirror/language';

export type FoldRange = { from: number; to: number };

/** Snapshot the currently folded ranges, in document order. */
export function readFolds(state: EditorState): FoldRange[] {
	const folds: FoldRange[] = [];
	foldedRanges(state).between(0, state.doc.length, (from, to) => {
		folds.push({ from, to });
	});
	return folds;
}

/** Re-apply saved folds, skipping any whose offsets no longer fit the document
 *  (e.g. the note was edited on another device since the folds were saved). */
export function restoreFolds(view: EditorView, folds: FoldRange[]): void {
	const max = view.state.doc.length;
	const valid = folds.filter((f) => f.from >= 0 && f.to <= max && f.from < f.to);
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
