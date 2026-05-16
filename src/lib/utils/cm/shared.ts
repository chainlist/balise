import { ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';

export const hideMark = Decoration.replace({});

export function makePlugin(build: (v: EditorView) => DecorationSet) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = build(view);
			}
			update(u: ViewUpdate) {
				if (u.docChanged || u.selectionSet || u.viewportChanged) this.decorations = build(u.view);
			}
		},
		{ decorations: (v) => v.decorations }
	);
}
