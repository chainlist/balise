import { StateField, Prec } from '@codemirror/state';
import type { EditorState, Extension, Range } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import TaskCard, { type TaskStatus } from '$lib/components/cm/TaskCard.svelte';
import { SvelteWidget, type MarkMode } from './shared';

const TASK_TAG_RE = /#(todo|done|inprogress)\b/i;
const TASK_TAG_STRIP_RE = /#(todo|done|inprogress)\b\s*/gi;

const NEXT_STATUS_TAG: Record<TaskStatus, string> = {
	todo: '#inprogress',
	inprogress: '#done',
	done: '#todo'
};

function tagToStatus(tag: string): TaskStatus {
	const lower = tag.toLowerCase();
	if (lower === 'done') return 'done';
	if (lower === 'inprogress') return 'inprogress';
	return 'todo';
}

type TaskProps = { status: TaskStatus; text: string; onToggle: () => void };

class TaskWidget extends SvelteWidget<TaskProps> {
	protected component = TaskCard;
	protected override tagName = 'div' as const;
	protected override ignoreEvents = false;
	constructor(
		readonly status: TaskStatus,
		readonly text: string,
		readonly markerFrom: number,
		readonly markerTo: number,
		readonly nextInsert: string
	) {
		super();
	}

	protected override setup(div: HTMLElement) {
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
	}

	protected getProps(view: EditorView): TaskProps {
		return {
			status: this.status,
			text: this.text,
			onToggle: () =>
				view.dispatch({
					changes: { from: this.markerFrom, to: this.markerTo, insert: this.nextInsert }
				})
		};
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
}

function buildTaskTagDecos(mode: MarkMode, state: EditorState): DecorationSet {
	if (mode === 'always') return Decoration.none;

	const cursorLine = state.doc.lineAt(state.selection.main.head).number;
	const ranges: Range<Decoration>[] = [];

	for (let i = 1; i <= state.doc.lines; i++) {
		const line = state.doc.line(i);
		// Always reveal on the cursor line so the raw markdown is editable
		// even in 'never' mode — button clicks are guarded by stopPropagation.
		if (line.number === cursorLine) continue;

		const match = TASK_TAG_RE.exec(line.text);
		if (!match) continue;

		// Lone task tag (no other text on the line) falls through to tagPlugin as a chip.
		const displayText = line.text.replace(TASK_TAG_STRIP_RE, '').trim();
		if (displayText.length === 0) continue;

		const status = tagToStatus(match[1]);
		const tagFrom = line.from + match.index;
		const tagTo = tagFrom + match[0].length;

		ranges.push(
			Decoration.replace({
				widget: new TaskWidget(status, displayText, tagFrom, tagTo, NEXT_STATUS_TAG[status])
			}).range(line.from, line.to)
		);
	}

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

export function mdTaskTagPlugin(mode: MarkMode): Extension {
	return Prec.high(
		StateField.define<DecorationSet>({
			create(state) {
				return buildTaskTagDecos(mode, state);
			},
			update(decos, tr) {
				if (tr.docChanged || tr.selection) return buildTaskTagDecos(mode, tr.state);
				return decos.map(tr.changes);
			},
			provide(field) {
				return EditorView.decorations.from(field);
			}
		})
	);
}
