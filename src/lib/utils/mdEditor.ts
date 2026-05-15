/* eslint-disable @typescript-eslint/no-explicit-any */
import { ViewPlugin, Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { mount, unmount } from 'svelte';
import TagChip from '$lib/components/notes/TagChip.svelte';
import { tagState } from '$lib/services/tags.svelte';

// --- Style marks (add CSS classes to formatted regions) -----------------------

const STYLE_NODES: Record<string, string> = {
	StrongEmphasis: 'cm-md-bold',
	Emphasis: 'cm-md-italic',
	InlineCode: 'cm-md-code',
	Strikethrough: 'cm-md-strike',
	ATXHeading1: 'cm-md-h1',
	ATXHeading2: 'cm-md-h2',
	ATXHeading3: 'cm-md-h3'
};

function buildStyleDecos(view: EditorView): DecorationSet {
	const ranges: Range<Decoration>[] = [];

	syntaxTree(view.state).iterate({
		enter(node) {
			const cls = STYLE_NODES[node.name];
			if (cls) ranges.push(Decoration.mark({ class: cls }).range(node.from, node.to));
		}
	});

	// Sort by start asc, end desc (outer ranges first). Skip nested overlaps.
	ranges.sort((a, b) => a.from - b.from || b.to - a.to);
	const deduped: Range<Decoration>[] = [];
	let lastTo = -1;
	for (const r of ranges) {
		if (r.from >= lastTo) {
			deduped.push(r);
			lastTo = r.to;
		}
	}

	return Decoration.set(deduped);
}

// --- Hide marks (replace syntax chars with nothing on non-cursor lines) --------

const HIDE_NODES = new Set(['EmphasisMark', 'InlineCodeMark', 'StrikethroughMark', 'CodeMark']);

const hideMark = Decoration.replace({});

class BulletWidget extends WidgetType {
	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-md-bullet';
		span.textContent = '•';
		return span;
	}
	eq() {
		return true;
	}
}

const bulletWidget = new BulletWidget();

class HrWidget extends WidgetType {
	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-md-hr';
		return span;
	}
	eq() {
		return true;
	}
}

const hrWidget = new HrWidget();

function buildHideDecos(view: EditorView): DecorationSet {
	const { state } = view;
	const cursorLine = state.doc.lineAt(state.selection.main.head).number;
	const ranges: Range<Decoration>[] = [];

	syntaxTree(state).iterate({
		enter(node) {
			const { from, to, name } = node;

			if (name === 'ListMark') {
				const isBullet = node.node.parent?.parent?.name === 'BulletList';
				if (isBullet) ranges.push(Decoration.replace({ widget: bulletWidget }).range(from, to));
				return;
			}

			const onCursorLine = state.doc.lineAt(from).number === cursorLine;
			if (onCursorLine) return;

			if (HIDE_NODES.has(name)) {
				ranges.push(hideMark.range(from, to));
			} else if (name === 'HeaderMark') {
				const lineEnd = state.doc.lineAt(from).to;
				ranges.push(hideMark.range(from, Math.min(to + 1, lineEnd)));
			} else if (name === 'HorizontalRule') {
				ranges.push(Decoration.replace({ widget: hrWidget }).range(from, to));
			}
		}
	});

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges);
}

// --- List line decorations (indent list items) --------------------------------

function buildListLineDecos(view: EditorView): DecorationSet {
	const { state } = view;
	const seen = new Set<number>();
	const ranges: Range<Decoration>[] = [];

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'ListItem') return;
			let pos = node.from;
			while (pos <= node.to) {
				const line = state.doc.lineAt(pos);
				if (!seen.has(line.from)) {
					seen.add(line.from);
					ranges.push(Decoration.line({ class: 'cm-md-list-item' }).range(line.from));
				}
				if (line.to >= node.to) break;
				pos = line.to + 1;
			}
		}
	});

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges);
}

// --- Tag decorations (#tag rendered as Svelte chip on non-cursor lines) -------

const TAG_RE = /#[a-zA-Z0-9/]{2,}/g;

class TagWidget extends WidgetType {
	constructor(readonly tag: string) {
		console.log('Creating TagWidget for', tag);
		super();
	}

	eq(other: TagWidget) {
		return other.tag === this.tag;
	}

	toDOM(): HTMLElement {
		const span = document.createElement('span');
		const instance = mount(TagChip, { target: span, props: { tag: this.tag, navigate: true } });
		(span as any)._sv = instance;
		return span;
	}

	destroy(dom: HTMLElement) {
		const instance = (dom as any)._sv;
		if (instance) unmount(instance);
	}

	ignoreEvent() {
		return true;
	}
}

function buildTagDecos(view: EditorView): DecorationSet {
	const { state } = view;
	const cursorLine = state.doc.lineAt(state.selection.main.head).number;
	const ranges: Range<Decoration>[] = [];

	for (const { from, to } of view.visibleRanges) {
		TAG_RE.lastIndex = 0;
		const text = state.doc.sliceString(from, to);
		let match: RegExpExecArray | null;
		while ((match = TAG_RE.exec(text)) !== null) {
			const start = from + match.index;
			const end = start + match[0].length;
			if (state.doc.lineAt(start).number === cursorLine) {
				const rawTag = match[0].slice(1);
				const tagColor =
					tagState.tags.find((t) => t.tag.toLowerCase() === rawTag.toLowerCase())?.color ??
					'var(--primary)';
				ranges.push(
					Decoration.mark({
						class: 'cm-md-tag',
						attributes: {
							style: `color: ${tagColor}; background: color-mix(in oklch, ${tagColor} 12%, transparent);`
						}
					}).range(start, end)
				);
			} else {
				ranges.push(
					Decoration.replace({ widget: new TagWidget(match[0].slice(1)) }).range(start, end)
				);
			}
		}
	}

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

// --- Plugins ------------------------------------------------------------------

function makePlugin(build: (v: EditorView) => DecorationSet) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = build(view);
			}
			update(u: ViewUpdate) {
				if (u.docChanged || u.selectionSet || u.viewportChanged) this.decorations = build(u.view);
			}
		},
		{ decorations: (v) => v.decorations }
	);
}

// --- Pair auto-close (* *), (_ _), (( )), ([ ]) ---------------------------------

const PAIRS: Record<string, string> = { '*': '*', _: '_', '(': ')', '[': ']' };

export const mdPairPlugin = EditorView.inputHandler.of((view, _from, _to, text) => {
	const close = PAIRS[text];
	if (close === undefined) return false;

	const { state } = view;
	view.dispatch(
		state.update(
			state.changeByRange((range) => {
				if (!range.empty) {
					return {
						changes: [
							{ from: range.from, insert: text },
							{ from: range.to, insert: close }
						],
						range: EditorSelection.range(range.from + 1, range.to + 1)
					};
				}
				// Skip over existing closing char for asymmetric pairs
				if (text !== close && state.doc.sliceString(range.from, range.from + 1) === close) {
					return { range: EditorSelection.cursor(range.from + 1) };
				}
				return {
					changes: [{ from: range.from, to: range.to, insert: text + close }],
					range: EditorSelection.cursor(range.from + 1)
				};
			}),
			{ userEvent: 'input' }
		)
	);
	return true;
});

export const mdStylePlugin = makePlugin(buildStyleDecos);
export const mdHidePlugin = makePlugin(buildHideDecos);
export const mdListPlugin = makePlugin(buildListLineDecos);
export const mdTagPlugin = makePlugin(buildTagDecos);

// --- Theme --------------------------------------------------------------------

export const noteEditorTheme = EditorView.theme({
	'&': {
		color: 'var(--foreground)',
		background: 'transparent',
		height: '100%'
	},
	'&.cm-focused': { outline: 'none' },
	'.cm-scroller': {
		fontFamily: 'var(--font-sans)',
		overflow: 'auto',
		padding: '1.5rem',
		lineHeight: '1.75'
	},
	'.cm-content': { padding: '0', caretColor: 'var(--foreground)' },
	'.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--foreground)' },
	'.cm-line': { padding: '0' },
	'.cm-activeLine': { background: 'transparent' },
	'.cm-gutters': { display: 'none' },
	'&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
		background: 'color-mix(in oklch, var(--primary) 20%, transparent)'
	},

	// Markdown decorations
	'.cm-md-bold': { fontWeight: '600' },
	'.cm-md-italic': { fontStyle: 'italic', color: 'var(--primary)' },
	'.cm-md-strike': { textDecoration: 'line-through', opacity: '0.7' },
	'.cm-md-code': {
		fontFamily: 'ui-monospace, monospace',
		fontSize: '0.875em',
		background: 'color-mix(in oklch, var(--muted-foreground) 12%, transparent)',
		borderRadius: '3px',
		padding: '1px 3px'
	},
	'.cm-md-h1': {
		fontSize: '1.65em',
		fontWeight: '700',
		lineHeight: '1.2',
		border: '1px solid transparent',
		borderBottomColor: 'var(--primary)',
		width: '100%',
		display: 'inline-block'
	},
	'.cm-md-h2': { fontSize: '1.5em', fontWeight: '600', lineHeight: '1.4' },
	'.cm-md-h3': { fontSize: '1.25em', fontWeight: '600', lineHeight: '1.5' },
	'.cm-md-list-item': { paddingLeft: '1.5em', textIndent: '-1.5em' },
	'.cm-md-bullet': { color: 'oklch(0.6 0.22 300)' },
	'.cm-md-hr': {
		display: 'inline-block',
		width: '100%',
		height: '1px',
		background: 'var(--border)',
		verticalAlign: 'middle'
	},
	'.cm-md-tag': {
		color: 'var(--primary)',
		background: 'color-mix(in oklch, var(--primary) 12%, transparent)',
		borderRadius: 'calc(infinity * 1px)',
		padding: '0 calc(var(--spacing) * 1.5)'
	}
});
