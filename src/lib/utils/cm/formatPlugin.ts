import { keymap } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import type { SelectionRange, ChangeSpec, EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { UNDERLINE_SOURCE, COLOR_SOURCE } from '../markdown-patterns';

const NODE_FOR_MARK: Record<string, string> = {
	'*': 'Emphasis',
	'**': 'StrongEmphasis',
	'~~': 'Strikethrough'
};

type RangeResult = { changes: ChangeSpec | readonly ChangeSpec[]; range: SelectionRange };

// Cursor is inside a marked node — remove the wrapping marks.
function removeSurroundingMark(
	view: EditorView,
	range: SelectionRange,
	mark: string,
	targetNode: string
): RangeResult | null {
	const len = mark.length;
	let node = syntaxTree(view.state).resolveInner(range.from, -1);
	while (node.parent) {
		if (node.name === targetNode) {
			return {
				changes: [
					{ from: node.from, to: node.from + len },
					{ from: node.to - len, to: node.to }
				],
				range: EditorSelection.cursor(range.from - len)
			};
		}
		node = node.parent;
	}
	return null;
}

// String fallback for the empty-cursor case when a mark has no syntax-tree node
// (the `=` highlight isn't in the parser). Finds a delimiter pair on the cursor's
// line whose inner text contains the cursor and strips both delimiters.
function removeSurroundingMarkString(
	state: EditorState,
	range: SelectionRange,
	mark: string
): RangeResult | null {
	const len = mark.length;
	const line = state.doc.lineAt(range.from);
	const esc = mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`${esc}([^${esc}\\n]+)${esc}`, 'g');
	let m: RegExpExecArray | null;
	while ((m = re.exec(line.text)) !== null) {
		const from = line.from + m.index;
		const to = from + m[0].length;
		if (range.from >= from + len && range.from <= to - len) {
			return {
				changes: [
					{ from, to: from + len },
					{ from: to - len, to }
				],
				range: EditorSelection.cursor(range.from - len)
			};
		}
	}
	return null;
}

// Selection sits inside a parsed mark node (e.g. [hello] in **[hello]**) — strip
// that node's delimiters. Tree-based, like removeSurroundingMark, so toggling
// italic on bold **text** finds no Emphasis node and won't mistake the bold
// `*`s for its own (which string-adjacency would). A node's opening/closing
// marks always sit exactly at node.from..+len and node.to-len..to.
function removeWrappingMark(
	view: EditorView,
	range: SelectionRange,
	mark: string,
	targetNode: string
): RangeResult | null {
	const len = mark.length;
	let node = syntaxTree(view.state).resolveInner(range.from, 1);
	while (node.parent) {
		// Require the selection to fall within the node's content (between the
		// marks); selections that include the marks fall through to the string paths.
		if (node.name === targetNode && node.from + len <= range.from && range.to <= node.to - len) {
			return {
				changes: [
					{ from: node.from, to: node.from + len },
					{ from: node.to - len, to: node.to }
				],
				range: EditorSelection.range(range.anchor - len, range.head - len)
			};
		}
		node = node.parent;
	}
	return null;
}

// Marks sit outside the selection: *[hello]* → [hello]
function removeOuterMarks(
	view: EditorView,
	range: SelectionRange,
	mark: string
): RangeResult | null {
	const len = mark.length;
	const { state } = view;
	const before = state.doc.sliceString(range.from - len, range.from);
	const after = state.doc.sliceString(range.to, range.to + len);
	if (before !== mark || after !== mark) return null;
	// A `*` adjacent to another `*` belongs to `**`/`***`, not an italic delimiter;
	// stripping it would corrupt the bold marks. Let it fall through to wrapping.
	const repeat = mark[0];
	if (
		state.doc.sliceString(range.from - len - 1, range.from - len) === repeat ||
		state.doc.sliceString(range.to + len, range.to + len + 1) === repeat
	)
		return null;
	return {
		changes: [
			{ from: range.from - len, to: range.from },
			{ from: range.to, to: range.to + len }
		],
		range: EditorSelection.range(range.anchor - len, range.head - len)
	};
}

// Marks sit inside the selection: [*hello*] → [hello]
// Guard against matching a longer mark (e.g. ** when mark is *).
function removeInnerMarks(
	view: EditorView,
	range: SelectionRange,
	mark: string
): RangeResult | null {
	const len = mark.length;
	const text = view.state.doc.sliceString(range.from, range.to);
	if (
		!text.startsWith(mark) ||
		!text.endsWith(mark) ||
		text.length <= len * 2 ||
		text[len] === mark[len - 1] ||
		text[text.length - len - 1] === mark[0]
	)
		return null;
	const newFrom = range.from;
	const newTo = range.to - len * 2;
	return {
		changes: [
			{ from: range.from, to: range.from + len },
			{ from: range.to - len, to: range.to }
		],
		range: EditorSelection.range(
			range.anchor === range.from ? newFrom : newTo,
			range.head === range.from ? newFrom : newTo
		)
	};
}

// No existing marks — wrap selection.
function wrapWithMark(range: SelectionRange, mark: string): RangeResult {
	const len = mark.length;
	return {
		changes: [
			{ from: range.from, insert: mark },
			{ from: range.to, insert: mark }
		],
		range: EditorSelection.range(range.anchor + len, range.head + len)
	};
}

function toggleMark(view: EditorView, mark: string): boolean {
	const { state } = view;
	const targetNode = NODE_FOR_MARK[mark];
	const len = mark.length;

	view.dispatch(
		state.update(
			state.changeByRange((range) => {
				if (range.empty) {
					// Marks with a tree node use the tree path; marks without one
					// (`=` highlight) fall back to the string scan.
					const removed =
						removeSurroundingMark(view, range, mark, targetNode) ??
						(targetNode ? null : removeSurroundingMarkString(state, range, mark));
					return (
						removed ?? {
							changes: { from: range.from, insert: mark + mark },
							range: EditorSelection.cursor(range.from + len)
						}
					);
				}
				return (
					removeWrappingMark(view, range, mark, targetNode) ??
					removeOuterMarks(view, range, mark) ??
					removeInnerMarks(view, range, mark) ??
					wrapWithMark(range, mark)
				);
			}),
			{ userEvent: 'input' }
		)
	);
	return true;
}

// Underline has no markdown syntax, so it's represented as an HTML tag. The
// toolbar/keymap insert <u>…</u>, but existing <ins>…</ins> markup is recognised
// too (UNDERLINE_SOURCE matches both). The open/close marks differ, so this needs
// its own toggle (toggleMark only handles symmetric delimiters like ** or ~~).
const U_OPEN = '<u>';
const U_CLOSE = '</u>';
const UNDERLINE_RE = new RegExp(UNDERLINE_SOURCE, 'g');

// The <u>…</u> / <ins>…</ins> tag that fully encloses [from, to], or null. Tag
// lengths vary, so they're returned alongside the bounds.
function enclosingUnderline(
	state: EditorState,
	from: number,
	to: number
): { from: number; to: number; openLen: number; closeLen: number } | null {
	const text = state.doc.toString();
	UNDERLINE_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = UNDERLINE_RE.exec(text)) !== null) {
		const s = m.index;
		const e = s + m[0].length;
		if (from >= s && to <= e) {
			return { from: s, to: e, openLen: m[1].length + 2, closeLen: m[1].length + 3 };
		}
	}
	return null;
}

function toggleUnderline(view: EditorView): boolean {
	const { state } = view;
	const { from, to } = state.selection.main;
	if (from === to) return false; // underline wraps a selection, nothing to do on a bare cursor

	const found = enclosingUnderline(state, from, to);
	if (found) {
		const innerLen = found.to - found.closeLen - (found.from + found.openLen);
		view.dispatch(
			state.update({
				changes: [
					{ from: found.from, to: found.from + found.openLen },
					{ from: found.to - found.closeLen, to: found.to }
				],
				selection: EditorSelection.range(found.from, found.from + innerLen),
				userEvent: 'input'
			})
		);
	} else {
		view.dispatch(
			state.update({
				changes: [
					{ from, insert: U_OPEN },
					{ from: to, insert: U_CLOSE }
				],
				selection: EditorSelection.range(from + U_OPEN.length, to + U_OPEN.length),
				userEvent: 'input'
			})
		);
	}
	return true;
}

// Text color, like underline, has no markdown syntax, so it's stored as an inline
// HTML span: <span style="color: #hex">…</span>. The span that fully encloses
// [from, to], or null. The closing tag is always </span> (7 chars); the opening
// tag length varies with the color string, so it's derived from the match.
const COLOR_SPAN_RE = new RegExp(COLOR_SOURCE, 'g');

function enclosingColorSpan(
	state: EditorState,
	from: number,
	to: number
): { from: number; to: number; innerFrom: number; innerTo: number; color: string } | null {
	const text = state.doc.toString();
	COLOR_SPAN_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = COLOR_SPAN_RE.exec(text)) !== null) {
		const s = m.index;
		const e = s + m[0].length;
		if (from >= s && to <= e) {
			const openLen = m[0].length - m[2].length - 7;
			return { from: s, to: e, innerFrom: s + openLen, innerTo: e - 7, color: m[1] };
		}
	}
	return null;
}

// Apply a text color to the selection. When the selection sits in an existing
// color span: selecting the span's whole text replaces its color (or removes the
// span when the same color is picked again — toggle off); selecting only part of
// it splits the span into flat before/selected/after spans so just that part
// takes the new color (picking the span's own color is then a no-op). A selection
// outside any span is wrapped in a new span; a bare cursor outside any span is a
// no-op (there's nothing to color), like underline.
export function applyTextColor(view: EditorView, color: string): boolean {
	const { state } = view;
	const { from, to } = state.selection.main;
	const open = `<span style="color: ${color}">`;
	const found = enclosingColorSpan(state, from, to);

	if (found) {
		const sameColor = found.color.toLowerCase() === color.toLowerCase();
		const coversWholeSpan = from === found.innerFrom && to === found.innerTo;

		if (coversWholeSpan) {
			const inner = state.doc.sliceString(found.innerFrom, found.innerTo);
			if (sameColor) {
				view.dispatch(
					state.update({
						changes: { from: found.from, to: found.to, insert: inner },
						selection: EditorSelection.range(found.from, found.from + inner.length),
						userEvent: 'input'
					})
				);
			} else {
				const next = open + inner + '</span>';
				view.dispatch(
					state.update({
						changes: { from: found.from, to: found.to, insert: next },
						selection: EditorSelection.range(
							found.from + open.length,
							found.from + open.length + inner.length
						),
						userEvent: 'input'
					})
				);
			}
			return true;
		}

		// Partial selection: that sub-range is already the parent's color, so the
		// same color leaves it as is; a new color splits the span around it.
		if (sameColor) return true;

		const before = state.doc.sliceString(found.innerFrom, from);
		const selected = state.doc.sliceString(from, to);
		const after = state.doc.sliceString(to, found.innerTo);
		const parentOpen = `<span style="color: ${found.color}">`;

		let insert = before ? `${parentOpen}${before}</span>` : '';
		const selFrom = found.from + insert.length + open.length;
		insert += `${open}${selected}</span>`;
		if (after) insert += `${parentOpen}${after}</span>`;

		view.dispatch(
			state.update({
				changes: { from: found.from, to: found.to, insert },
				selection: EditorSelection.range(selFrom, selFrom + selected.length),
				userEvent: 'input'
			})
		);
		return true;
	}

	if (from === to) return false;
	view.dispatch(
		state.update({
			changes: [
				{ from, insert: open },
				{ from: to, insert: '</span>' }
			],
			selection: EditorSelection.range(from + open.length, to + open.length),
			userEvent: 'input'
		})
	);
	return true;
}

// The color wrapping the current selection (for the toolbar swatch), or null.
export function activeTextColor(state: EditorState): string | null {
	const { from, to } = state.selection.main;
	return enclosingColorSpan(state, from, to)?.color ?? null;
}

export type FormatMark = 'bold' | 'italic' | 'underline' | 'strike';

// Toggle commands shared by the keymap below and the text selection toolbar.
export const FORMAT_COMMANDS: Record<FormatMark, (view: EditorView) => boolean> = {
	bold: (view) => toggleMark(view, '**'),
	italic: (view) => toggleMark(view, '*'),
	strike: (view) => toggleMark(view, '~~'),
	underline: toggleUnderline
};

// Which marks already wrap the current selection (for toolbar active state).
// Emphasis marks live in the syntax tree; <ins> is matched by regex.
export function activeMarks(state: EditorState): Record<FormatMark, boolean> {
	const { from, to } = state.selection.main;
	const tree = syntaxTree(state);
	const wrappedBy = (nodeName: string): boolean => {
		let node = tree.resolveInner(from, 1);
		while (node.parent) {
			if (node.name === nodeName && node.from <= from && node.to >= to) return true;
			node = node.parent;
		}
		return false;
	};
	return {
		bold: wrappedBy('StrongEmphasis'),
		italic: wrappedBy('Emphasis'),
		strike: wrappedBy('Strikethrough'),
		underline: enclosingUnderline(state, from, to) !== null
	};
}

export const mdFormatPlugin = keymap.of([
	{ key: 'Mod-b', run: (view) => toggleMark(view, '**') },
	{ key: 'Mod-i', run: (view) => toggleMark(view, '*') },
	{ key: 'Mod-u', run: toggleUnderline },
	{ key: 'Mod-Shift-s', run: (view) => toggleMark(view, '~~') },
	{ key: 'Mod-Shift-h', run: (view) => toggleMark(view, '=') }
]);
