import { ViewPlugin, keymap } from '@codemirror/view';
import type { EditorView, ViewUpdate, PluginValue } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { mount, unmount, flushSync } from 'svelte';
import SlashMenu from '$lib/components/cm/SlashMenu.svelte';
import type { SlashAction, SlashMenuControls } from '$lib/components/cm/SlashMenu.svelte';

const SLASH_RE = /^[ \t]*\/(\w*)$/;

class SlashPluginClass implements PluginValue {
	menuInstance: ReturnType<typeof mount> | null = null;
	private menuContainer: HTMLElement | null = null;
	controls: Partial<SlashMenuControls> = {};
	private slashFrom = -1;
	active = false;

	constructor(private view: EditorView) {}

	update(update: ViewUpdate) {
		if (!update.docChanged && !update.selectionSet) return;

		const { state } = update;
		const sel = state.selection.main;

		if (sel.from !== sel.to) {
			this.close();
			return;
		}

		const line = state.doc.lineAt(sel.from);
		const upToCursor = line.text.slice(0, sel.from - line.from);
		const match = SLASH_RE.exec(upToCursor);

		if (match) {
			const slashFrom = line.from + upToCursor.lastIndexOf('/');
			this.slashFrom = slashFrom;
			const query = match[1];
			if (this.menuInstance) {
				this.controls.updateQuery?.(query);
			} else {
				this.view.requestMeasure({
					read: (view) => view.coordsAtPos(slashFrom),
					write: (coords) => {
						if (coords && this.slashFrom === slashFrom && !this.menuInstance) {
							this.open(coords.left, coords.bottom + 6, query);
						}
					}
				});
			}
		} else {
			this.close();
		}
	}

	private open(x: number, y: number, query: string) {
		this.active = true;
		this.menuContainer = document.createElement('div');
		document.body.appendChild(this.menuContainer);

		this.controls = {};
		const slashFrom = this.slashFrom;
		this.menuInstance = mount(SlashMenu, {
			target: this.menuContainer,
			props: {
				x,
				y,
				query,
				controls: this.controls as SlashMenuControls,
				onSelect: (action: SlashAction) => this.applyAction(action, slashFrom)
			}
		});
		flushSync(); // flush the component's $effect so controls are populated immediately
	}

	private applyAction(action: SlashAction, slashFrom: number) {
		const to = this.view.state.selection.main.from;
		this.view.dispatch({
			changes: { from: slashFrom, to, insert: action.insert },
			selection: { anchor: slashFrom + action.insert.length }
		});
		this.close();
	}

	close() {
		const wasActive = this.active;
		this.active = false;
		this.slashFrom = -1;
		this.controls = {};
		if (this.menuInstance) {
			unmount(this.menuInstance);
			this.menuInstance = null;
		}
		if (this.menuContainer) {
			this.menuContainer.remove();
			this.menuContainer = null;
		}
		if (wasActive) this.view.focus();
	}

	destroy() {
		this.active = false;
		this.controls = {};
		if (this.menuInstance) {
			unmount(this.menuInstance);
			this.menuInstance = null;
		}
		if (this.menuContainer) {
			this.menuContainer.remove();
			this.menuContainer = null;
		}
	}
}

const slashViewPlugin = ViewPlugin.fromClass(SlashPluginClass);

const slashKeymap = keymap.of([
	{
		key: 'ArrowDown',
		run: (view) => {
			const plugin = view.plugin(slashViewPlugin);
			if (!plugin?.active) return false;
			plugin.controls.moveDown?.();
			return true;
		}
	},
	{
		key: 'ArrowUp',
		run: (view) => {
			const plugin = view.plugin(slashViewPlugin);
			if (!plugin?.active) return false;
			plugin.controls.moveUp?.();
			return true;
		}
	},
	{
		key: 'Enter',
		run: (view) => {
			const plugin = view.plugin(slashViewPlugin);
			if (!plugin?.active || !plugin.controls.hasResults?.()) return false;
			plugin.controls.confirm?.();
			return true;
		}
	},
	{
		key: 'Escape',
		run: (view) => {
			const plugin = view.plugin(slashViewPlugin);
			if (!plugin?.active) return false;
			plugin.close();
			return true;
		}
	}
]);

export const mdSlashPlugin: Extension = [slashViewPlugin, Prec.highest(slashKeymap)];
