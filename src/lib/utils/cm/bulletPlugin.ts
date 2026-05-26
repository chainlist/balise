import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { makePlugin, type MarkMode } from './shared';

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

function buildBulletDecos(mode: MarkMode) {
	return (view: EditorView): DecorationSet => {
		if (mode === 'always') return Decoration.none;

		const ranges: Range<Decoration>[] = [];

		syntaxTree(view.state).iterate({
			enter(node) {
				if (node.name !== 'ListMark') return;
				const isBullet = node.node.parent?.parent?.name === 'BulletList';
				if (isBullet) {
					ranges.push(Decoration.replace({ widget: bulletWidget }).range(node.from, node.to));
				}
			}
		});

		return Decoration.set(ranges);
	};
}

export const mdBulletPlugin = (mode: MarkMode) => makePlugin(buildBulletDecos(mode), { selection: false });
