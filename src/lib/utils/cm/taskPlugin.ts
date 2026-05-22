/* eslint-disable @typescript-eslint/no-explicit-any */
import { StateField } from '@codemirror/state';
import type { EditorState, Extension } from '@codemirror/state';
import type { Range } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { mount, unmount } from 'svelte';
import TaskCard, { type TaskStatus } from '$lib/components/cm/TaskCard.svelte';
import type { MarkMode } from './shared';

// Checkbox syntax: "- [ ]", "- [x]", "- [~]"
// Group 1: marker char, Group 2: task text
const TASK_CHECKBOX_RE = /^[ \t]*- \[([xX~]?)\] (.+)$/;

// Hashtag syntax: a line containing #todo / #done / #inprogress
const TASK_TAG_RE = /#(todo|done|inprogress)\b/i;
const TASK_TAG_STRIP_RE = /#(todo|done|inprogress)\b\s*/gi;

// Custom DOM event fired by the widget; caught by taskToggleHandler below
const TOGGLE_EVENT = 'cm-task-toggle';

function checkboxMarkerToStatus(marker: string): TaskStatus {
	if (marker === 'x' || marker === 'X') return 'done';
	if (marker === '~') return 'inprogress';
	return 'todo';
}

function tagToStatus(tag: string): TaskStatus {
	const lower = tag.toLowerCase();
	if (lower === 'done') return 'done';
	if (lower === 'inprogress') return 'inprogress';
	return 'todo';
}

class TaskWidget extends WidgetType {
	constructor(
		readonly status: TaskStatus,
		readonly text: string,
		// Position of the toggleable marker in the document; -1 = not toggleable
		readonly markerFrom: number,
		readonly markerTo: number,
		readonly nextInsert: string
	) {
		super();
	}

	eq(other: TaskWidget) {
		return other.status === this.status && other.text === this.text;
	}

	toDOM(): HTMLElement {
		const div = document.createElement('div');
		// Store toggle coordinates as data attributes so the event handler can read them
		div.dataset.cmTaskFrom = String(this.markerFrom);
		div.dataset.cmTaskTo = String(this.markerTo);
		div.dataset.cmTaskInsert = this.nextInsert;

		const instance = mount(TaskCard, {
			target: div,
			props: {
				status: this.status,
				text: this.text,
				onToggle: this.nextInsert
					? () => div.dispatchEvent(new CustomEvent(TOGGLE_EVENT, { bubbles: true }))
					: () => {}
			}
		});
		(div as any)._sv = instance;
		return div;
	}

	destroy(dom: HTMLElement) {
		const instance = (dom as any)._sv;
		if (instance) unmount(instance);
	}

	ignoreEvent() {
		return true;
	}
}

// Reads toggle coordinates from the widget DOM and dispatches the CM transaction.
// Must be included alongside the StateField (returned together from mdTaskPlugin).
const taskToggleHandler = EditorView.domEventHandlers({
	'cm-task-toggle'(event, view) {
		const el = (event.target as Element).closest('[data-cm-task-from]') as HTMLElement | null;
		if (!el || !el.dataset.cmTaskInsert) return false;
		view.dispatch({
			changes: {
				from: parseInt(el.dataset.cmTaskFrom!),
				to: parseInt(el.dataset.cmTaskTo!),
				insert: el.dataset.cmTaskInsert
			}
		});
		return true;
	}
});

function buildTaskDecos(mode: MarkMode, state: EditorState): DecorationSet {
	if (mode === 'always') return Decoration.none;

	const cursorLine = state.doc.lineAt(state.selection.main.head).number;
	const ranges: Range<Decoration>[] = [];

	for (let i = 1; i <= state.doc.lines; i++) {
		const line = state.doc.line(i);

		// Cursor on this line → show raw markdown for editing
		if (line.number === cursorLine) continue;

		const checkboxMatch = TASK_CHECKBOX_RE.exec(line.text);

		if (checkboxMatch) {
			// --- Checkbox syntax: "- [ ] text" ---
			const status = checkboxMarkerToStatus(checkboxMatch[1]);
			const taskText = checkboxMatch[2];
			const bracketOffset = line.text.indexOf('[');
			const markerFrom = line.from + bracketOffset;
			const markerTo = markerFrom + 3; // "[ ]" / "[x]" / "[~]" are always 3 chars
			const nextInsert = status !== 'inprogress' ? (status === 'todo' ? '[x]' : '[ ]') : '';

			ranges.push(
				Decoration.replace({
					widget: new TaskWidget(status, taskText, markerFrom, markerTo, nextInsert),
					block: true
				}).range(line.from, line.to)
			);
		} else {
			// --- Hashtag syntax: any line containing #todo / #done / #inprogress ---
			const tagMatch = TASK_TAG_RE.exec(line.text);
			if (tagMatch) {
				const status = tagToStatus(tagMatch[1]);
				const tagFrom = line.from + tagMatch.index;
				const tagTo = tagFrom + tagMatch[0].length;
				const displayText = line.text.replace(TASK_TAG_STRIP_RE, '').trim();
				const nextInsert = status !== 'inprogress' ? (status === 'todo' ? '#done' : '#todo') : '';

				ranges.push(
					Decoration.replace({
						widget: new TaskWidget(status, displayText, tagFrom, tagTo, nextInsert),
						block: true
					}).range(line.from, line.to)
				);
			}
		}
	}

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

function buildTaskStateField(mode: MarkMode) {
	return StateField.define<DecorationSet>({
		create(state) {
			return buildTaskDecos(mode, state);
		},
		update(decos, tr) {
			if (tr.docChanged || tr.selection) return buildTaskDecos(mode, tr.state);
			return decos.map(tr.changes);
		},
		provide(field) {
			return EditorView.decorations.from(field);
		}
	});
}

export function mdTaskPlugin(mode: MarkMode): Extension {
	return [buildTaskStateField(mode), taskToggleHandler];
}
