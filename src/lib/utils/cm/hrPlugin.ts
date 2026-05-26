import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin, isRevealed, type MarkMode } from './shared';

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

function buildHrDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		if (mode === 'always') return Decoration.none;

		const { state } = view;
		const cursorLine = state.doc.lineAt(state.selection.main.head).number;
		const ranges: Range<Decoration>[] = [];

		syntaxTree(state).iterate({
			enter(node) {
				if (node.name !== 'HorizontalRule') return;
				const hrLine = state.doc.lineAt(node.from).number;
				if (isRevealed(mode, hrLine, cursorLine)) return;
				ranges.push(Decoration.replace({ widget: hrWidget }).range(node.from, node.to));
			}
		});

		return Decoration.set(ranges);
	};
}

export const mdHrPlugin = (mode: MarkMode) => makePlugin(buildHrDecos(mode));
