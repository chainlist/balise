import { EditorView, Decoration, keymap } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { Prec, type EditorState, type Extension } from '@codemirror/state';
import {
	emphasisMarks,
	highlightMarks,
	isMarkRevealed,
	isRevealed,
	type EmphasisMark,
	type MarkMode
} from './shared';

// Combine emphasis marks (parent-bounds reveal) and highlight marks
// (line-based reveal) into a single list of marks that are currently hidden.
// Emphasis and highlight use different reveal predicates to mirror the
// visual behavior in hidePlugin and highlightPlugin respectively.
function hiddenMarks(state: EditorState, mode: MarkMode): EmphasisMark[] {
	if (mode === 'always') return [];
	const cursorPos = state.selection.main.head;
	const cursorLine = state.doc.lineAt(cursorPos).number;
	const out: EmphasisMark[] = [];

	for (const m of emphasisMarks(state)) {
		if (isMarkRevealed(mode, m.parentFrom, m.parentTo, cursorPos)) continue;
		out.push(m);
	}
	for (const m of highlightMarks(state)) {
		if (isRevealed(mode, state.doc.lineAt(m.parentFrom).number, cursorLine)) continue;
		out.push(m);
	}
	return out;
}

// Build a range set of hidden marks for EditorView.atomicRanges so vertical
// motion and clicks skip over them.
function hiddenMarkRanges(view: EditorView, mode: MarkMode): DecorationSet {
	if (mode === 'always') return Decoration.none;
	const ranges = hiddenMarks(view.state, mode).map((m) =>
		Decoration.mark({}).range(m.from, m.to)
	);
	return Decoration.set(ranges, true);
}

// A position is "forbidden" if landing the cursor there would look identical
// to landing one step further out. For a hidden emphasis **bold**:
//   - positions strictly inside the marks (between the two * chars)
//   - the inner edges (right after opening mark / right before closing mark)
// Skipping both makes the cursor hop in 3-char steps at the boundary instead
// of two visually-indistinguishable single-char steps.
function isForbidden(pos: number, marks: EmphasisMark[]): boolean {
	for (const m of marks) {
		// Opening mark: forbid (m.from, m.to] — inside the mark and the inner edge.
		if (m.from === m.parentFrom && pos > m.from && pos <= m.to) return true;
		// Closing mark: forbid [m.from, m.to) — the inner edge and inside the mark.
		if (m.to === m.parentTo && pos >= m.from && pos < m.to) return true;
	}
	return false;
}

function moveByCanonical(view: EditorView, mode: MarkMode, direction: -1 | 1): boolean {
	if (mode === 'always') return false;
	const { state } = view;
	const range = state.selection.main;
	if (!range.empty) return false;

	const pos = range.head;
	const marks = hiddenMarks(state, mode);
	const docLen = state.doc.length;

	let target = pos + direction;
	while (target >= 0 && target <= docLen && isForbidden(target, marks)) {
		target += direction;
	}

	if (target < 0 || target > docLen || target === pos) return false;
	view.dispatch({ selection: { anchor: target } });
	return true;
}

// Backspace at the end of a hidden closing mark: delete the character INSIDE
// the emphasis, just before the mark. Symmetric for Delete on opening marks.
function deleteThroughMark(view: EditorView, mode: MarkMode, direction: -1 | 1): boolean {
	if (mode === 'always') return false;
	const { state } = view;
	const range = state.selection.main;
	if (!range.empty) return false;
	const pos = range.head;

	const adjacent = hiddenMarks(state, mode).find((m) =>
		direction === -1 ? m.to === pos : m.from === pos
	);
	if (!adjacent) return false;

	const from = direction === -1 ? adjacent.from - 1 : adjacent.to;
	const to = from + 1;
	if (from < 0 || to > state.doc.length) return false;

	// Keep cursor inside the mark after the delete. `from` (in old-doc coords)
	// stays at the same position in the new doc since it sits at the edge of the
	// deleted range, so passing it as the new-state anchor lands the cursor right
	// against the surviving mark — "at the end of content" (Backspace) or "at the
	// start of content" (Delete).
	view.dispatch({ changes: { from, to }, selection: { anchor: from } });
	return true;
}

export function mdMarkNavPlugin(mode: MarkMode): Extension {
	return [
		EditorView.atomicRanges.of((view) => hiddenMarkRanges(view, mode)),
		Prec.high(
			keymap.of([
				{ key: 'ArrowLeft', run: (view) => moveByCanonical(view, mode, -1) },
				{ key: 'ArrowRight', run: (view) => moveByCanonical(view, mode, 1) },
				{ key: 'Backspace', run: (view) => deleteThroughMark(view, mode, -1) },
				{ key: 'Delete', run: (view) => deleteThroughMark(view, mode, 1) }
			])
		)
	];
}
