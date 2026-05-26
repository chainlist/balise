/* eslint-disable @typescript-eslint/no-explicit-any */
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { mount, unmount } from 'svelte';
import TagChip from '$lib/components/cm/TagChip.svelte';
import { tagsService } from '$lib/services/tags.svelte';
import { parseAllHashtags } from '$lib/utils/tag-parser';
import { makePlugin, type MarkMode } from './shared';

class TagWidget extends WidgetType {
	constructor(readonly tag: string) {
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
				if (mode === 'always' || (mode === 'cursor' && cursorPos >= start && cursorPos <= end)) {
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
