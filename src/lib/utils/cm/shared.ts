import { ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';

export type MarkMode = 'always' | 'cursor' | 'never';

export const hideMark = Decoration.replace({});

// Lenient emphasis patterns: match even when the parser rejects them (e.g. trailing spaces).
// Bold must come before italic to avoid partial matches inside ** delimiters.
// [regex, cssClass, markLength]
export const LENIENT_EMPHASIS: [RegExp, string, number][] = [
	[/\*\*([^\n*]+)\*\*/g, 'cm-md-bold', 2],
	[/(?<![A-Za-z0-9])__([^\n_]+)__(?![A-Za-z0-9])/g, 'cm-md-bold', 2],
	[/\*([^\n*]+)\*/g, 'cm-md-italic', 1],
	[/(?<![A-Za-z0-9])_([^\n_]+)_(?![A-Za-z0-9])/g, 'cm-md-italic', 1],
	[/~~([^\n~]+)~~/g, 'cm-md-strike', 2]
];

export function makePlugin(
	build: (v: EditorView) => DecorationSet,
	{ selection = true }: { selection?: boolean } = {}
) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = build(view);
			}
			update(u: ViewUpdate) {
				if (u.docChanged || u.viewportChanged || (selection && u.selectionSet))
					this.decorations = build(u.view);
			}
		},
		{ decorations: (v) => v.decorations }
	);
}
