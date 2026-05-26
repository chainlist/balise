import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import TagChip from '$lib/components/cm/TagChip.svelte';
import { tagsService } from '$lib/services/tags.svelte';
import { parseAllHashtags } from '$lib/utils/tag-parser';
import { makePlugin, SvelteWidget, isMarkRevealed, type MarkMode } from './shared';

class TagWidget extends SvelteWidget<{ tag: string; navigate: boolean }> {
	protected component = TagChip;
	constructor(readonly tag: string) {
		super();
	}
	protected getProps() {
		return { tag: this.tag, navigate: true };
	}
	eq(other: TagWidget) {
		return other.tag === this.tag;
	}
}

function buildTagDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		const { state } = view;
		const cursorPos = state.selection.main.head;
		const ranges: Range<Decoration>[] = [];

		const tagColorMap = new Map(tagsService.tags.map((t) => [t.tag.toLowerCase(), t.color]));

		for (const { from, to } of view.visibleRanges) {
			const text = state.doc.sliceString(from, to);
			for (const m of parseAllHashtags(text)) {
				const start = from + m.index;
				const end = start + m.length;
				if (isMarkRevealed(mode, start, end, cursorPos)) {
					const tagColor = tagColorMap.get(m.name.toLowerCase()) ?? 'var(--primary)';
					ranges.push(
						Decoration.mark({
							class: 'cm-md-tag',
							attributes: {
								style: `color: ${tagColor}; background: color-mix(in oklch, ${tagColor} 12%, transparent);`
							}
						}).range(start, end)
					);
				} else {
					ranges.push(Decoration.replace({ widget: new TagWidget(m.name) }).range(start, end));
				}
			}
		}

		ranges.sort((a, b) => a.from - b.from);
		return Decoration.set(ranges, true);
	};
}

export const mdTagPlugin = (mode: MarkMode) => makePlugin(buildTagDecos(mode));
