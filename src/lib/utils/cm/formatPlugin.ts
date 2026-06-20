import { keymap } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import type { SelectionRange, ChangeSpec, EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { HIGHLIGHT_SOURCE, UNDERLINE_SOURCE, COLOR_SOURCE } from '../markdown-patterns';

const NODE_FOR_MARK: Record<string, string> = {
	'*': 'Emphasis',
	'**': 'StrongEmphasis',
	'~~': 'Strikethrough'
};

type RangeResult = { changes: ChangeSpec | readonly ChangeSpec[]; range: SelectionRange };

type MarkSpan = { from: number; to: number };

// Does `range` reach into the mark's content (the text between its delimiters)?
// An empty cursor counts when it sits anywhere within the content (inclusive); a
// selection counts when it overlaps the content at all, so a selection straddling
// a delimiter still resolves to the whole mark (the toggle's touch-it-remove-it
// policy).
function overlapsContent(range: SelectionRange, from: number, to: number, len: number): boolean {
	const cFrom = from + len;
	const cTo = to - len;
	if (range.empty) return range.from >= cFrom && range.from <= cTo;
	return range.from < cTo && range.to > cFrom;
}

// Source regex for a delimiter pair. The `=` highlight reuses the shared pattern
// (its `(?!")` guard stops a `style="…"` run in a color span from reading as a
// pair); the emphasis-family marks get a lenient delimiter/content/delimiter whose
// inner run excludes the delimiter char.
function pairSource(mark: string): string {
	if (mark === '=') return HIGHLIGHT_SOURCE;
	const esc = mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const inner = mark[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return `${esc}([^${inner}\\n]+)${esc}`;
}

// A single `*` next to another `*` belongs to a `**`/`***` run, not an italic
// pair; reject those so the scan never mistakes bold delimiters for its own.
function notAdjacentRun(state: EditorState, span: MarkSpan, mark: string): boolean {
	if (mark[0] !== '*') return true;
	return (
		state.doc.sliceString(span.from - 1, span.from) !== '*' &&
		state.doc.sliceString(span.to, span.to + 1) !== '*'
	);
}

// String scan for marks the tree can't give us: the `=` highlight (never parsed)
// and emphasis the parser rejected (e.g. trailing-space `*foo *`). Returns the
// first pair on the cursor's line whose content the selection reaches into.
function findMarkByScan(state: EditorState, range: SelectionRange, mark: string): MarkSpan | null {
	const len = mark.length;
	const line = state.doc.lineAt(range.from);
	const re = new RegExp(pairSource(mark), 'g');
	let m: RegExpExecArray | null;
	while ((m = re.exec(line.text)) !== null) {
		const span = { from: line.from + m.index, to: line.from + m.index + m[0].length };
		if (overlapsContent(range, span.from, span.to, len) && notAdjacentRun(state, span, mark))
			return span;
	}
	return null;
}

// The mark of this type the selection should toggle off, with its delimiters
// included in the returned bounds, or null. Emphasis-family marks resolve from the
// syntax tree (which disambiguates `*`/`**`/`***` for free); anything else falls
// back to the string scan.
function findEnclosingMark(
	state: EditorState,
	range: SelectionRange,
	mark: string
): MarkSpan | null {
	const targetNode = NODE_FOR_MARK[mark];
	const len = mark.length;
	if (targetNode) {
		let node = syntaxTree(state).resolveInner(range.from, range.empty ? -1 : 1);
		while (node.parent) {
			if (node.name === targetNode && overlapsContent(range, node.from, node.to, len))
				return { from: node.from, to: node.to };
			node = node.parent;
		}
	}
	return findMarkByScan(state, range, mark);
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
	const len = mark.length;

	view.dispatch(
		state.update(
			state.changeByRange((range) => {
				const span = findEnclosingMark(state, range, mark);
				if (span) {
					const { from, to } = span;
					// Map a position to where it lands after the two delimiters are deleted.
					const mapPos = (p: number): number => {
						let d = 0;
						if (p >= from + len) d += len;
						else if (p > from) d += p - from;
						if (p >= to) d += len;
						else if (p > to - len) d += p - (to - len);
						return p - d;
					};
					return {
						changes: [
							{ from, to: from + len },
							{ from: to - len, to }
						],
						range: range.empty
							? EditorSelection.cursor(mapPos(range.from))
							: EditorSelection.range(mapPos(range.anchor), mapPos(range.head))
					};
				}
				if (range.empty)
					return {
						changes: { from: range.from, insert: mark + mark },
						range: EditorSelection.cursor(range.from + len)
					};
				return wrapWithMark(range, mark);
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

type ColorSpan = { from: number; to: number; innerFrom: number; innerTo: number; color: string };

function allColorSpans(state: EditorState): ColorSpan[] {
	const text = state.doc.toString();
	COLOR_SPAN_RE.lastIndex = 0;
	const out: ColorSpan[] = [];
	let m: RegExpExecArray | null;
	while ((m = COLOR_SPAN_RE.exec(text)) !== null) {
		const from = m.index;
		const to = from + m[0].length;
		const openLen = m[0].length - m[2].length - 7;
		out.push({ from, to, innerFrom: from + openLen, innerTo: to - 7, color: m[1] });
	}
	return out;
}

function enclosingColorSpan(state: EditorState, from: number, to: number): ColorSpan | null {
	return allColorSpans(state).find((s) => from >= s.from && to <= s.to) ?? null;
}

// Inline marks whose delimiters can hug a color span's edges, mapping an opening
// delimiter to its closing one (symmetric for emphasis/strike/highlight, distinct
// for the underline tags). Used to tell when a selection that excludes these
// concealed delimiters still covers the span's whole content.
const MARK_DELIMITERS: Record<string, string> = {
	'*': '*',
	'**': '**',
	'***': '***',
	'~~': '~~',
	'=': '=',
	'<u>': '</u>',
	'<ins>': '</ins>'
};

// True when the selection covers the span's content: either an exact match, or the
// only thing between the selection and the span edges is a matching pair of mark
// delimiters (e.g. selecting "summary" inside <span>*summary*</span>, where the `*`
// are concealed). In that case the marks belong to the word, so the whole span is
// recolored as a unit instead of being split apart and orphaning the delimiters.
function coversSpanContent(state: EditorState, span: ColorSpan, from: number, to: number): boolean {
	if (from === span.innerFrom && to === span.innerTo) return true;
	const before = state.doc.sliceString(span.innerFrom, from);
	const after = state.doc.sliceString(to, span.innerTo);
	return before.length > 0 && MARK_DELIMITERS[before] === after;
}

// Strip color-span open/close tags from a slice so its colored runs collapse to
// their plain text (other marks like <u> are left in place). Used when absorbing
// existing spans into a new color.
function stripColorTags(s: string): string {
	return s.replace(/<span style="color:\s*[^"]+">/g, '').replace(/<\/span>/g, '');
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
		const coversWholeSpan = coversSpanContent(state, found, from, to);

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

	// Selection crosses one or more color span boundaries (no single span
	// encloses it). Rebuild the affected region as FLAT sibling spans so we never
	// nest one color span inside another: the concealment regex can't parse
	// nesting and would leak raw <span> tags. Span content outside the selection
	// keeps its color; everything inside takes the new color. A side that already
	// has the new color is merged in rather than left as a redundant sibling.
	const overlapping = allColorSpans(state).filter((s) => s.innerFrom < to && s.innerTo > from);
	if (overlapping.length > 0) {
		const lower = color.toLowerCase();
		const leftSpan = overlapping.find((s) => s.innerFrom < from) ?? null;
		const rightSpan = overlapping.find((s) => s.innerTo > to) ?? null;
		const regionFrom = leftSpan ? leftSpan.from : from;
		const regionTo = rightSpan ? rightSpan.to : to;

		const selected = stripColorTags(state.doc.sliceString(from, to));
		let inner = selected;
		let lead = 0; // chars merged in before the user's selection
		let leftKeep = '';
		if (leftSpan) {
			const text = state.doc.sliceString(leftSpan.innerFrom, from);
			if (leftSpan.color.toLowerCase() === lower) {
				inner = text + inner;
				lead = text.length;
			} else {
				leftKeep = `<span style="color: ${leftSpan.color}">${text}</span>`;
			}
		}
		let rightKeep = '';
		if (rightSpan) {
			const text = state.doc.sliceString(to, rightSpan.innerTo);
			if (rightSpan.color.toLowerCase() === lower) inner += text;
			else rightKeep = `<span style="color: ${rightSpan.color}">${text}</span>`;
		}

		const middle = inner ? open + inner + '</span>' : '';
		const insert = leftKeep + middle + rightKeep;
		const selFrom = regionFrom + leftKeep.length + (middle ? open.length : 0) + lead;
		view.dispatch(
			state.update({
				changes: { from: regionFrom, to: regionTo, insert },
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
