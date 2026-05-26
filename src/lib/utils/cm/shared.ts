import { ViewPlugin, Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { mount, unmount, type Component } from 'svelte';

export type MarkMode = 'always' | 'cursor' | 'never';

export const hideMark = Decoration.replace({});

// Should the raw markdown be visible (mark shown / widget skipped)?
// Line-based rule: cursor anywhere on the element's line reveals it. Used by
// link, tag, highlight, checkbox, taskTag — all inline/block widgets that
// occupy whole tokens or whole lines.
export function isRevealed(mode: MarkMode, line: number, cursorLine: number): boolean {
	if (mode === 'always') return true;
	if (mode === 'never') return false;
	return line === cursorLine;
}

// Token-based rule for emphasis marks: cursor must be within the parent
// node's bounds (the wrapping Emphasis / StrongEmphasis / etc.). Only used
// by hidePlugin where revealing all marks on a line would be visually noisy.
export function isMarkRevealed(
	mode: MarkMode,
	parentFrom: number,
	parentTo: number,
	cursorPos: number
): boolean {
	if (mode === 'always') return true;
	if (mode === 'never') return false;
	return cursorPos >= parentFrom && cursorPos <= parentTo;
}

// Parser nodes that wrap inline emphasis marks. The marks themselves (EmphasisMark,
// CodeMark, etc.) live as children of these nodes.
export const PARSED_EMPHASIS = new Set([
	'Emphasis',
	'StrongEmphasis',
	'Strikethrough',
	'InlineCode'
]);

export type EmphasisMark = {
	from: number;
	to: number;
	parentFrom: number;
	parentTo: number;
};

// Walk the syntax tree and collect every emphasis mark (the opening/closing
// delimiter chars), tagged with the bounds of its wrapping emphasis node.
// Consumers (hidePlugin, markNavPlugin) decide what to do with them.
export function emphasisMarks(state: EditorState): EmphasisMark[] {
	const out: EmphasisMark[] = [];
	syntaxTree(state).iterate({
		enter(node) {
			if (!node.name.endsWith('Mark')) return;
			const parent = node.node.parent;
			if (!parent || !PARSED_EMPHASIS.has(parent.name)) return;
			out.push({
				from: node.from,
				to: node.to,
				parentFrom: parent.from,
				parentTo: parent.to
			});
		}
	});
	return out;
}

// Highlight marks =text= aren't in the syntax tree — collect them via the
// same regex highlightPlugin uses. Same shape as emphasisMarks so consumers
// can treat them uniformly.
const HIGHLIGHT_MARK_RE = /=([^=\n]+)=/g;

export function highlightMarks(state: EditorState): EmphasisMark[] {
	const out: EmphasisMark[] = [];
	const text = state.doc.toString();
	HIGHLIGHT_MARK_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = HIGHLIGHT_MARK_RE.exec(text)) !== null) {
		const parentFrom = m.index;
		const parentTo = parentFrom + m[0].length;
		out.push({ from: parentFrom, to: parentFrom + 1, parentFrom, parentTo });
		out.push({ from: parentTo - 1, to: parentTo, parentFrom, parentTo });
	}
	return out;
}

export const BARE_URL_RE = /https?:\/\/[^\s<>[\]()'"]+/g;

// Lenient emphasis patterns: match even when the parser rejects them (e.g. trailing spaces).
// Bold must come before italic to avoid partial matches inside ** delimiters.
// [regex, cssClass, markLength]
export const LENIENT_EMPHASIS: [RegExp, string, number][] = [
	[/\*\*([^\n*]+)\*\*/g, 'cm-md-bold', 2],
	[/(?<![A-Za-z0-9])__([^\n_]+)__(?![A-Za-z0-9])/g, 'cm-md-bold', 2],
	[/\*([^\n*]+)\*/g, 'cm-md-italic', 1],
	[/(?<![A-Za-z0-9])_([^\n_]+)_(?![A-Za-z0-9])/g, 'cm-md-italic', 1],
	[/~~([^\n~]+)~~/g, 'cm-md-strike', 2]
];

// Sort by start asc, end desc (outer ranges first), then drop any range nested in an earlier one.
export function dedupeOverlapping(ranges: Range<Decoration>[]): Range<Decoration>[] {
	ranges.sort((a, b) => a.from - b.from || b.to - a.to);
	const out: Range<Decoration>[] = [];
	let lastTo = -1;
	for (const r of ranges) {
		if (r.from >= lastTo) {
			out.push(r);
			lastTo = r.to;
		}
	}
	return out;
}

export function makePlugin(
	build: (v: EditorView) => DecorationSet,
	{ selection = true }: { selection?: boolean } = {}
) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = build(view);
			}
			update(u: ViewUpdate) {
				if (u.docChanged || u.viewportChanged || (selection && u.selectionSet))
					this.decorations = build(u.view);
			}
		},
		{ decorations: (v) => v.decorations }
	);
}

const widgetInstances = new WeakMap<HTMLElement, ReturnType<typeof mount>>();

export abstract class SvelteWidget<P extends Record<string, unknown>> extends WidgetType {
	protected abstract component: Component<P>;
	protected abstract getProps(view: EditorView): P;
	protected tagName: 'span' | 'div' = 'span';
	protected ignoreEvents = true;

	protected setup(_el: HTMLElement, _view: EditorView): void { }

	toDOM(view: EditorView): HTMLElement {
		const el = document.createElement(this.tagName);
		this.setup(el, view);
		const instance = mount(this.component, { target: el, props: this.getProps(view) });
		widgetInstances.set(el, instance);
		return el;
	}

	destroy(dom: HTMLElement): void {
		const instance = widgetInstances.get(dom);
		if (instance) {
			unmount(instance);
			widgetInstances.delete(dom);
		}
	}

	ignoreEvent(): boolean {
		return this.ignoreEvents;
	}
}
