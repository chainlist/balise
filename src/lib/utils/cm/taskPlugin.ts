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
		readonly markerFrom: number,
		readonly markerTo: number,
		readonly nextInsert: string
	) {
		super();
	}

	eq(other: TaskWidget) {
		return (
			other.status === this.status &&
			other.text === this.text &&
			other.markerFrom === this.markerFrom &&
			other.markerTo === this.markerTo &&
			other.nextInsert === this.nextInsert
		);
	}

	toDOM(view: EditorView): HTMLElement {
		const div = document.createElement('div');
		// inline-block keeps cm-line in an inline formatting context, preventing the
		// browser from creating anonymous block boxes around cm-widgetBuffer siblings,
		// which would otherwise add a full line-height of empty space above the card.
		div.style.cssText = 'display:inline-block;width:100%;vertical-align:top';

		// Prevent CM from placing the cursor on mousedown within the toggle button.
		// Without this, CM moves the cursor to the task line on mousedown, which
		// destroys the widget before onclick fires (Chrome won't fire click on detached nodes).
		// Non-button clicks still propagate so clicking the task text enters edit mode.
		div.addEventListener('mousedown', (e) => {
			if ((e.target as Element).closest('button')) e.stopPropagation();
		});

		const instance = mount(TaskCard, {
			target: div,
			props: {
				status: this.status,
				text: this.text,
				onToggle: () =>
					view.dispatch({
						changes: { from: this.markerFrom, to: this.markerTo, insert: this.nextInsert }
					})
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
			const cycleCheckbox: Record<TaskStatus, string> = { todo: '[~]', inprogress: '[x]', done: '[ ]' };
			const nextInsert = cycleCheckbox[status];

			ranges.push(
				Decoration.replace({
					widget: new TaskWidget(status, taskText, markerFrom, markerTo, nextInsert)
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
				const cycleTag: Record<TaskStatus, string> = { todo: '#inprogress', inprogress: '#done', done: '#todo' };
				const nextInsert = cycleTag[status];

				ranges.push(
					Decoration.replace({
						widget: new TaskWidget(status, displayText, tagFrom, tagTo, nextInsert)
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
	return buildTaskStateField(mode);
}
