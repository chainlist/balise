import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import LinkChip from '$lib/components/cm/LinkChip.svelte';
import { makePlugin, SvelteWidget, isRevealed, forEachBareUrl, type MarkMode } from './shared';

class LinkWidget extends SvelteWidget<{ href: string; label: string }> {
	protected component = LinkChip;
	constructor(
		readonly href: string,
		readonly label: string
	) {
		super();
	}
	protected getProps() {
		return { href: this.href, label: this.label };
	}
	eq(other: LinkWidget) {
		return other.href === this.href && other.label === this.label;
	}
}

function buildLinkDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
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
					if (name !== 'Link') return;
					if (isRevealed(mode, state.doc.lineAt(from).number, cursorLine)) return false;
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
			});
		}

		forEachBareUrl(view, mode, cursorLine, (start, end, text) => {
			ranges.push(Decoration.replace({ widget: new LinkWidget(text, text) }).range(start, end));
		});

		ranges.sort((a, b) => a.from - b.from);
		return Decoration.set(ranges, true);
	};
}

export const mdLinkPlugin = (mode: MarkMode) => makePlugin(buildLinkDecos(mode));
