/* eslint-disable @typescript-eslint/no-explicit-any */
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { mount, unmount } from 'svelte';
import LinkChip from '$lib/components/cm/LinkChip.svelte';
import { makePlugin } from './shared';

class LinkWidget extends WidgetType {
	constructor(
		readonly href: string,
		readonly label: string
	) {
		super();
	}

	eq(other: LinkWidget) {
		return other.href === this.href && other.label === this.label;
	}

	toDOM(): HTMLElement {
		const span = document.createElement('span');
		const instance = mount(LinkChip, { target: span, props: { href: this.href, label: this.label } });
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

const BARE_URL_RE = /https?:\/\/[^\s<>[\]()'"]+/g;

function buildLinkDecos(view: EditorView): DecorationSet {
	const { state } = view;
	const cursorLine = state.doc.lineAt(state.selection.main.head).number;
	const ranges: Range<Decoration>[] = [];
	const tree = syntaxTree(state);

	for (const { from: vFrom, to: vTo } of view.visibleRanges) {
		tree.iterate({
			from: vFrom,
			to: vTo,
			enter(node) {
				const { from, to, name } = node;

				if (name === 'Link') {
					if (state.doc.lineAt(from).number === cursorLine) return false;
					let href = '';
					let urlFrom = -1;
					for (let child = node.node.firstChild; child; child = child.nextSibling) {
						if (child.name === 'URL') {
							href = state.doc.sliceString(child.from, child.to);
							urlFrom = child.from;
						}
					}
					if (href && urlFrom > 0) {
						const label = state.doc.sliceString(from + 1, urlFrom - 2);
						ranges.push(
							Decoration.replace({ widget: new LinkWidget(href, label || href) }).range(from, to)
						);
					}
					return false;
				}
			}
		});
	}

	for (const { from, to } of view.visibleRanges) {
		BARE_URL_RE.lastIndex = 0;
		const text = state.doc.sliceString(from, to);
		let match: RegExpExecArray | null;
		while ((match = BARE_URL_RE.exec(text)) !== null) {
			const start = from + match.index;
			const end = start + match[0].length;
			if (state.doc.lineAt(start).number === cursorLine) continue;

			let skip = false;
			for (let cur = tree.resolveInner(start, 1); cur.parent; cur = cur.parent) {
				if (
					cur.name === 'Link' ||
					cur.name === 'InlineCode' ||
					cur.name === 'FencedCode' ||
					cur.name === 'CodeBlock'
				) {
					skip = true;
					break;
				}
			}
			if (skip) continue;

			ranges.push(
				Decoration.replace({ widget: new LinkWidget(match[0], match[0]) }).range(start, end)
			);
		}
	}

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

export const mdLinkPlugin = makePlugin(buildLinkDecos);
