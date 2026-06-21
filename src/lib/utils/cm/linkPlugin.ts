import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range, EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import LinkChip from '$lib/components/cm/LinkChip.svelte';
import {
	makePlugin,
	SvelteWidget,
	isRevealed,
	forEachBareUrl,
	BARE_URL_RE,
	type MarkMode
} from './shared';

// Is the link/URL the sole (non-whitespace) content of its line? Only then does
// the chip offer the "embed" button — embedding makes no sense for an inline link.
function ownsLine(state: EditorState, from: number, to: number): boolean {
	const line = state.doc.lineAt(from);
	if (to > line.to) return false;
	const before = state.doc.sliceString(line.from, from);
	const after = state.doc.sliceString(to, line.to);
	return before.trim() === '' && after.trim() === '';
}

// Promote the link/URL on the widget's live line to an embed: add the `!` to a
// markdown link, or wrap a bare URL as `![](url)`. Positions are re-resolved
// from the DOM since build-time positions go stale as the doc changes.
function embedAtLine(view: EditorView, el: HTMLElement): void {
	const { state } = view;
	const line = state.doc.lineAt(view.posAtDOM(el));
	let linkFrom = -1;
	syntaxTree(state).iterate({
		from: line.from,
		to: line.to,
		enter(node) {
			if (node.name === 'Link' && linkFrom < 0) {
				linkFrom = node.from;
				return false;
			}
		}
	});
	if (linkFrom >= 0) {
		view.dispatch({ changes: { from: linkFrom, insert: '!' } });
		return;
	}
	BARE_URL_RE.lastIndex = 0;
	const m = BARE_URL_RE.exec(line.text);
	if (!m) return;
	const from = line.from + m.index;
	view.dispatch({ changes: { from, to: from + m[0].length, insert: `![](${m[0]})` } });
}

class LinkWidget extends SvelteWidget<{
	href: string;
	label: string;
	canEmbed: boolean;
	onEmbed: () => void;
}> {
	protected component = LinkChip;
	#el: HTMLElement | null = null;
	constructor(
		readonly href: string,
		readonly label: string,
		readonly canEmbed: boolean
	) {
		super();
	}
	protected setup(el: HTMLElement) {
		this.#el = el;
	}
	protected getProps(view: EditorView) {
		return {
			href: this.href,
			label: this.label,
			canEmbed: this.canEmbed,
			onEmbed: () => {
				if (this.#el) embedAtLine(view, this.#el);
			}
		};
	}
	eq(other: LinkWidget) {
		return (
			other.href === this.href && other.label === this.label && other.canEmbed === this.canEmbed
		);
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
						const canEmbed = ownsLine(state, from, to);
						ranges.push(
							Decoration.replace({ widget: new LinkWidget(href, label || href, canEmbed) }).range(
								from,
								to
							)
						);
					}
					return false;
				}
			});
		}

		forEachBareUrl(view, mode, cursorLine, (start, end, text) => {
			const canEmbed = ownsLine(state, start, end);
			ranges.push(
				Decoration.replace({ widget: new LinkWidget(text, text, canEmbed) }).range(start, end)
			);
		});

		ranges.sort((a, b) => a.from - b.from);
		return Decoration.set(ranges, true);
	};
}

export const mdLinkPlugin = (mode: MarkMode) => makePlugin(buildLinkDecos(mode));
