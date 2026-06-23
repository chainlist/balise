import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import DateChip from '$lib/components/cm/DateChip.svelte';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { findDates } from '$lib/domain/datetime';
import { makePlugin, SvelteWidget, isRevealed, type MarkMode } from './shared';

class DateWidget extends SvelteWidget<{ label: string; date: Date }> {
	protected component = DateChip;
	constructor(
		readonly label: string,
		readonly date: Date
	) {
		super();
	}
	protected getProps() {
		return { label: this.label, date: this.date };
	}
	eq(other: DateWidget) {
		return other.label === this.label && other.date.getTime() === this.date.getTime();
	}
}

// Don't turn a date into a chip when it lives inside a link, inline code or a code
// block — there it's URL/source text, not prose. Mirrors linkPlugin's bare-URL guard.
function inExcludedNode(tree: ReturnType<typeof syntaxTree>, pos: number): boolean {
	for (let cur = tree.resolveInner(pos, 1); cur.parent; cur = cur.parent) {
		if (
			cur.name === 'Link' ||
			cur.name === 'InlineCode' ||
			cur.name === 'FencedCode' ||
			cur.name === 'CodeBlock'
		)
			return true;
	}
	return false;
}

function buildDateDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		const { state } = view;
		const cursorLine = state.doc.lineAt(state.selection.main.head).number;
		const { dateFormat, language } = settingsService.general.state;
		const tree = syntaxTree(state);
		const ranges: Range<Decoration>[] = [];

		for (const { from, to } of view.visibleRanges) {
			const text = state.doc.sliceString(from, to);
			for (const match of findDates(text, dateFormat, language)) {
				const start = from + match.index;
				const end = start + match.text.length;
				if (isRevealed(mode, state.doc.lineAt(start).number, cursorLine)) continue;
				if (inExcludedNode(tree, start)) continue;
				ranges.push(
					Decoration.replace({ widget: new DateWidget(match.text, match.date) }).range(start, end)
				);
			}
		}

		ranges.sort((a, b) => a.from - b.from);
		return Decoration.set(ranges, true);
	};
}

export const mdDatePlugin = (mode: MarkMode) => makePlugin(buildDateDecos(mode));
