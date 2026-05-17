import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin, hideMark, LENIENT_EMPHASIS } from './shared';

const PARSED_EMPHASIS = new Set(['Emphasis', 'StrongEmphasis', 'Strikethrough', 'InlineCode']);

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
	const cursorPos = state.selection.main.head;
	const cursorLine = state.doc.lineAt(cursorPos).number;
	const ranges: Range<Decoration>[] = [];
	const parsedRanges: [number, number][] = [];

	syntaxTree(state).iterate({
		enter(node) {
			const { from, to, name } = node;

			if (PARSED_EMPHASIS.has(name)) {
				parsedRanges.push([from, to]);
			}

			if (name === 'ListMark') {
				const isBullet = node.node.parent?.parent?.name === 'BulletList';
				if (isBullet) ranges.push(Decoration.replace({ widget: bulletWidget }).range(from, to));
				return;
			}

			const onCursorLine = state.doc.lineAt(from).number === cursorLine;
			const parent = node.node.parent;
			const cursorInBlock = !!parent && cursorPos >= parent.from && cursorPos <= parent.to;
			if (onCursorLine || cursorInBlock) return;

			if (name === 'HeaderMark') {
				const lineEnd = state.doc.lineAt(from).to;
				ranges.push(hideMark.range(from, Math.min(to + 1, lineEnd)));
			} else if (name === 'HorizontalRule') {
				ranges.push(Decoration.replace({ widget: hrWidget }).range(from, to));
			} else if (name.endsWith('Mark')) {
				ranges.push(hideMark.range(from, to));
			}
		}
	});

	// Regex fallback: hide marks for emphasis patterns the parser rejected (e.g. trailing spaces).
	const isCoveredByTree = (from: number, to: number) =>
		parsedRanges.some(([f, t]) => from >= f && to <= t);
	const lenientCovered: [number, number][] = [];

	for (const { from: vFrom, to: vTo } of view.visibleRanges) {
		const text = state.doc.sliceString(vFrom, vTo);
		for (const [re, , markLen] of LENIENT_EMPHASIS) {
			re.lastIndex = 0;
			let m: RegExpExecArray | null;
			while ((m = re.exec(text)) !== null) {
				const from = vFrom + m.index;
				const to = from + m[0].length;
				if (isCoveredByTree(from, to)) continue;
				if (lenientCovered.some(([f, t]) => from >= f && to <= t)) continue;
				lenientCovered.push([from, to]);

				if (state.doc.lineAt(from).number === cursorLine) continue;
				ranges.push(hideMark.range(from, from + markLen));
				ranges.push(hideMark.range(to - markLen, to));
			}
		}
	}

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

export const mdHidePlugin = makePlugin(buildHideDecos);
