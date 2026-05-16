import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin, hideMark } from './shared';

const HIDE_NODES = new Set(['EmphasisMark', 'InlineCodeMark', 'StrikethroughMark']);

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

export const mdHidePlugin = makePlugin(buildHideDecos);
