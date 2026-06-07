import { StateField, Prec } from '@codemirror/state';
import type { Extension, Range, Line } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import TaskCard, { type TaskStatus } from '$lib/components/cm/TaskCard.svelte';
import { SvelteWidget, buildLineDecos, type MarkMode } from './shared';
import { SYSTEM_TAGS } from '$lib/utils/tag-constants';

const TASK_TAG_RE = /#(todo|done|inprogress)\b/i;
const TASK_TAG_STRIP_RE = /#(todo|done|inprogress)\b\s*/gi;

const NEXT_STATUS_TAG: Record<TaskStatus, string> = {
	todo: `#${SYSTEM_TAGS.INPROGRESS}`,
	inprogress: `#${SYSTEM_TAGS.DONE}`,
	done: `#${SYSTEM_TAGS.TODO}`
};

function tagToStatus(tag: string): TaskStatus {
	const lower = tag.toLowerCase();
	if (lower === SYSTEM_TAGS.DONE) return SYSTEM_TAGS.DONE;
	if (lower === SYSTEM_TAGS.INPROGRESS) return SYSTEM_TAGS.INPROGRESS;
	return SYSTEM_TAGS.TODO;
}

type TaskProps = { status: TaskStatus; text: string; onToggle: () => void; onEdit?: (newText: string) => void };

class TaskWidget extends SvelteWidget<TaskProps> {
	protected component = TaskCard;
	protected override tagName = 'div' as const;
	constructor(
		readonly status: TaskStatus,
		readonly text: string,
		readonly markerFrom: number,
		readonly markerTo: number,
		readonly nextInsert: string,
		readonly lineFrom: number,
		readonly editEnabled: boolean
	) {
		super();
	}

	protected override setup(div: HTMLElement) {
		div.style.cssText = 'display:inline-block;width:100%;vertical-align:top';
		// Stop all mousedown propagation so CM never places the cursor on this line.
		// Cursor placement (mousedown) and click events are independent — onclick
		// on the card and its buttons still fires normally after stopPropagation.
		div.addEventListener('mousedown', (e) => e.stopPropagation());
	}

	protected getProps(view: EditorView): TaskProps {
		return {
			status: this.status,
			text: this.text,
			onToggle: () =>
				view.dispatch({
					changes: { from: this.markerFrom, to: this.markerTo, insert: this.nextInsert }
				}),
			onEdit: this.editEnabled
				? (newText: string) => {
						const line = view.state.doc.lineAt(this.lineFrom);
						view.dispatch({
							changes: { from: line.from, to: line.to, insert: `${newText} #${this.status}` }
						});
					}
				: undefined
		};
	}

	eq(other: TaskWidget) {
		return (
			other.status === this.status &&
			other.text === this.text &&
			other.markerFrom === this.markerFrom &&
			other.markerTo === this.markerTo &&
			other.nextInsert === this.nextInsert &&
			other.lineFrom === this.lineFrom &&
			other.editEnabled === this.editEnabled
		);
	}
}

function processTaskTagLine(mode: MarkMode) {
	return (line: Line, ranges: Range<Decoration>[]) => {
		const match = TASK_TAG_RE.exec(line.text);
		if (!match) return;

		// Lone task tag (no other text on the line) falls through to tagPlugin as a chip.
		const displayText = line.text.replace(TASK_TAG_STRIP_RE, '').trim();
		if (displayText.length === 0) return;

		const status = tagToStatus(match[1]);
		const tagFrom = line.from + match.index;
		const tagTo = tagFrom + match[0].length;

		ranges.push(
			Decoration.replace({
				widget: new TaskWidget(
					status,
					displayText,
					tagFrom,
					tagTo,
					NEXT_STATUS_TAG[status],
					line.from,
					mode === 'never'
				)
			}).range(line.from, line.to)
		);
	};
}

export function mdTaskTagPlugin(mode: MarkMode): Extension {
	const process = processTaskTagLine(mode);
	return Prec.high(
		StateField.define<DecorationSet>({
			create(state) {
				return buildLineDecos(mode, state, process);
			},
			update(decos, tr) {
				if (tr.docChanged || tr.selection) return buildLineDecos(mode, tr.state, process);
				return decos.map(tr.changes);
			},
			provide(field) {
				return EditorView.decorations.from(field);
			}
		})
	);
}
