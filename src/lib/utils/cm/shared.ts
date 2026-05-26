import { ViewPlugin, Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { mount, unmount, type Component } from 'svelte';

export type MarkMode = 'always' | 'cursor' | 'never';

export const hideMark = Decoration.replace({});

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

	protected setup(_el: HTMLElement, _view: EditorView): void {}

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
