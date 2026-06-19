import { ViewPlugin } from '@codemirror/view';
import type { EditorView, ViewUpdate, PluginValue } from '@codemirror/view';
import { mount, unmount, flushSync } from 'svelte';
import TextToolbar from '$lib/components/cm/TextToolbar.svelte';
import type { TextToolbarControls, ToolbarAnchor } from '$lib/components/cm/TextToolbar.svelte';
import { FORMAT_COMMANDS, activeMarks, type FormatMark } from './formatPlugin';

// A floating toolbar that fades in over the current selection and toggles the
// inline format marks. The component is mounted once for the editor's lifetime
// and shown/hidden via `controls`, so its fade transition plays on every toggle.
class TextToolbarPluginClass implements PluginValue {
	private container: HTMLElement;
	private instance: ReturnType<typeof mount>;
	private controls: Partial<TextToolbarControls> = {};

	constructor(private view: EditorView) {
		this.container = document.createElement('div');
		document.body.appendChild(this.container);
		this.instance = mount(TextToolbar, {
			target: this.container,
			props: {
				controls: this.controls as TextToolbarControls,
				oncommand: (mark: FormatMark) => this.run(mark)
			}
		});
		flushSync(); // flush the component's $effect so controls.show/hide are populated
		this.sync();
	}

	update(u: ViewUpdate) {
		if (
			u.selectionSet ||
			u.docChanged ||
			u.focusChanged ||
			u.viewportChanged ||
			u.geometryChanged
		) {
			this.sync();
		}
	}

	private sync() {
		const { view } = this;
		const sel = view.state.selection.main;
		if (!view.hasFocus || sel.empty) {
			this.controls.hide?.();
			return;
		}
		view.requestMeasure({
			key: 'text-toolbar',
			read: (v) => ({ start: v.coordsAtPos(sel.from), end: v.coordsAtPos(sel.to) }),
			write: ({ start, end }) => {
				const cur = view.state.selection.main;
				if (!start || !end || cur.empty || !view.hasFocus) {
					this.controls.hide?.();
					return;
				}
				const sameLine = Math.abs(start.top - end.top) < 1;
				const anchor: ToolbarAnchor = {
					left: sameLine ? (start.left + end.right) / 2 : start.left,
					top: Math.min(start.top, end.top),
					bottom: Math.max(start.bottom, end.bottom)
				};
				this.controls.show?.(anchor, activeMarks(view.state));
			}
		});
	}

	private run(mark: FormatMark) {
		FORMAT_COMMANDS[mark](this.view);
		this.view.focus();
	}

	destroy() {
		unmount(this.instance);
		this.container.remove();
	}
}

export const mdTextToolbarPlugin = ViewPlugin.fromClass(TextToolbarPluginClass);
