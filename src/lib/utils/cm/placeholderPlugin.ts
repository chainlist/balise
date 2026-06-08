import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { makePlugin } from './shared';
import * as m from '$paraglide/messages.js';

class PlaceholderWidget extends WidgetType {
	constructor(readonly text: string) {
		super();
	}
	eq(other: PlaceholderWidget) {
		return other.text === this.text;
	}
	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-md-placeholder';
		span.textContent = this.text;
		return span;
	}
	ignoreEvent() {
		return false;
	}
}

// Ghost hint on the cursor's line when it's empty. side: 1 keeps the caret
// before the widget; pointer-events: none (in theme) lets clicks fall through.
function buildPlaceholderDeco(view: EditorView): DecorationSet {
	const sel = view.state.selection.main;
	if (!sel.empty) return Decoration.none;
	const line = view.state.doc.lineAt(sel.head);
	if (line.length !== 0) return Decoration.none;
	const widget = Decoration.widget({ widget: new PlaceholderWidget(m.editor_placeholder()), side: 1 });
	return Decoration.set(widget.range(line.from));
}

export const mdPlaceholderPlugin = makePlugin(buildPlaceholderDeco);
