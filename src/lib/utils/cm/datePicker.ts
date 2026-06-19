import { ViewPlugin, keymap } from '@codemirror/view';
import type { EditorView, ViewUpdate, PluginValue } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { mount, unmount } from 'svelte';
import DatePicker from '$lib/components/cm/DatePicker.svelte';
import type { DatePickerAnchor } from '$lib/components/cm/DatePicker.svelte';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { formatDate } from '$lib/utils/date-format';

// `@` at line start or after a space/tab, with the cursor right after it.
const AT_RE = /(?:^|[ \t])@$/;

class DatePickerPluginClass implements PluginValue {
	private pickerInstance: ReturnType<typeof mount> | null = null;
	private pickerContainer: HTMLElement | null = null;
	private atFrom = -1;
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

		if (AT_RE.test(upToCursor)) {
			// The picker has no text query, so once it's open we leave it alone;
			// reopening on every keystroke would fight the calendar for focus.
			if (this.pickerInstance) return;
			const atFrom = sel.from - 1;
			this.atFrom = atFrom;
			this.view.requestMeasure({
				read: (view) => view.coordsAtPos(atFrom),
				write: (coords) => {
					if (coords && this.atFrom === atFrom && !this.pickerInstance) {
						this.open(coords, atFrom);
					}
				}
			});
		} else {
			this.close();
		}
	}

	private open(anchor: DatePickerAnchor, atFrom: number) {
		this.active = true;
		this.pickerContainer = document.createElement('div');
		document.body.appendChild(this.pickerContainer);

		this.pickerInstance = mount(DatePicker, {
			target: this.pickerContainer,
			props: {
				anchor,
				onSelect: (date: Date) => this.applySelection(date, atFrom),
				onDismiss: () => this.close()
			}
		});
	}

	private applySelection(date: Date, atFrom: number) {
		const to = this.view.state.selection.main.from;
		const insert = formatDate(
			date,
			settingsService.general.state.dateFormat,
			settingsService.general.state.language
		);
		this.view.dispatch({
			changes: { from: atFrom, to, insert },
			selection: { anchor: atFrom + insert.length }
		});
		this.close();
	}

	private teardown() {
		if (this.pickerInstance) {
			unmount(this.pickerInstance);
			this.pickerInstance = null;
		}
		if (this.pickerContainer) {
			this.pickerContainer.remove();
			this.pickerContainer = null;
		}
	}

	close() {
		const wasActive = this.active;
		this.active = false;
		this.atFrom = -1;
		this.teardown();
		if (wasActive) this.view.focus();
	}

	destroy() {
		this.active = false;
		this.teardown();
	}
}

const datePickerViewPlugin = ViewPlugin.fromClass(DatePickerPluginClass);

const datePickerKeymap = keymap.of([
	{
		key: 'Escape',
		run: (view) => {
			const plugin = view.plugin(datePickerViewPlugin);
			if (!plugin?.active) return false;
			plugin.close();
			return true;
		}
	}
]);

export const mdDatePicker: Extension = [datePickerViewPlugin, Prec.highest(datePickerKeymap)];
