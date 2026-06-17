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
