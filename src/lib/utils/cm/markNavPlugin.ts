import { EditorView, Decoration, keymap } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { Prec, type EditorState, type Extension } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import {
	emphasisMarks,
	highlightMarks,
	isMarkRevealed,
	isRevealed,
	dedupeOverlapping,
	forEachBareUrl,
	type EmphasisMark,
	type MarkMode
} from './shared';

type Atom = { from: number; to: number };

// Combine emphasis marks (parent-bounds reveal) and highlight marks
// (line-based reveal) into a single list of marks that are currently hidden.
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

// Collect link ranges that are currently hidden as widget replacements.
// Mirrors the reveal logic in linkPlugin so the two stay in sync.
function linkAtoms(view: EditorView, mode: MarkMode): Atom[] {
	if (mode === 'always') return [];
	const { state } = view;
	const cursorLine = state.doc.lineAt(state.selection.main.head).number;
	const out: Atom[] = [];
	const tree = syntaxTree(state);

	for (const { from: vFrom, to: vTo } of view.visibleRanges) {
		tree.iterate({
			from: vFrom,
			to: vTo,
			enter(node) {
				if (node.name !== 'Link') return;
				if (isRevealed(mode, state.doc.lineAt(node.from).number, cursorLine)) return false;
				for (let child = node.node.firstChild; child; child = child.nextSibling) {
					if (child.name === 'URL') {
						out.push({ from: node.from, to: node.to });
						break;
					}
				}
				return false;
			}
		});
	}

	forEachBareUrl(view, mode, cursorLine, (start, end) => out.push({ from: start, to: end }));

	return out;
}

function hiddenMarkRanges(view: EditorView, mode: MarkMode): DecorationSet {
	if (mode === 'always') return Decoration.none;
	const markRanges = hiddenMarks(view.state, mode).map((m) =>
		Decoration.mark({}).range(m.from, m.to)
	);
	const atomRanges = linkAtoms(view, mode).map((a) => Decoration.mark({}).range(a.from, a.to));
	return Decoration.set(dedupeOverlapping([...markRanges, ...atomRanges]), true);
}

function isForbidden(pos: number, marks: EmphasisMark[]): boolean {
	for (const m of marks) {
		if (m.from === m.parentFrom && pos > m.from && pos <= m.to) return true;
		if (m.to === m.parentTo && pos >= m.from && pos < m.to) return true;
	}
	return false;
}

function isForbiddenInAtom(pos: number, atoms: Atom[]): boolean {
	for (const a of atoms) {
		if (pos > a.from && pos < a.to) return true;
	}
	return false;
}

function isBlockedPosition(pos: number, marks: EmphasisMark[], atoms: Atom[]): boolean {
	return isForbidden(pos, marks) || isForbiddenInAtom(pos, atoms);
}

// Returns the cursor position if the selection is collapsed and mode is not 'always',
// otherwise null. Used as the shared guard for moveByCanonical and deleteThroughMark.
function getCollapsedCursorPos(view: EditorView, mode: MarkMode): number | null {
	if (mode === 'always') return null;
	const range = view.state.selection.main;
	return range.empty ? range.head : null;
}

function moveByCanonical(view: EditorView, mode: MarkMode, direction: -1 | 1): boolean {
	const pos = getCollapsedCursorPos(view, mode);
	if (pos === null) return false;

	const marks = hiddenMarks(view.state, mode);
	const atoms = linkAtoms(view, mode);
	const docLen = view.state.doc.length;

	let target = pos + direction;
	while (target >= 0 && target <= docLen && isBlockedPosition(target, marks, atoms)) {
		target += direction;
	}

	if (target < 0 || target > docLen || target === pos) return false;
	view.dispatch({ selection: { anchor: target } });
	return true;
}

// Backspace at the end of a hidden closing mark: delete the character INSIDE
// the emphasis, just before the mark. Symmetric for Delete on opening marks.
function deleteThroughMark(view: EditorView, mode: MarkMode, direction: -1 | 1): boolean {
	const pos = getCollapsedCursorPos(view, mode);
	if (pos === null) return false;

	const adjacent = hiddenMarks(view.state, mode).find((m) =>
		direction === -1 ? m.to === pos : m.from === pos
	);
	if (!adjacent) return false;

	const from = direction === -1 ? adjacent.from - 1 : adjacent.to;
	const to = from + 1;
	if (from < 0 || to > view.state.doc.length) return false;

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
