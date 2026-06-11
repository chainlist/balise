import { StateField, Prec } from '@codemirror/state';
import type { Extension, Range, Line } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import Checkbox from '$lib/components/cm/Checkbox.svelte';
import { SvelteWidget, buildLineDecos, type MarkMode } from './shared';
import { CHECKBOX_RE } from '../markdown-patterns';

type CheckboxProps = { checked: boolean; onToggle: () => void };

class CheckboxWidget extends SvelteWidget<CheckboxProps> {
	protected component = Checkbox;
	constructor(
		readonly checked: boolean,
		readonly markerFrom: number,
		readonly markerTo: number
	) {
		super();
	}

	protected override setup(span: HTMLElement) {
		// Stop mousedown from reaching CM so the cursor doesn't move to this line
		// before onclick fires - if CM repositions on mousedown the widget is destroyed
		// and Chrome won't fire click on a detached node.
		span.addEventListener('mousedown', (e) => e.stopPropagation());
	}

	protected getProps(view: EditorView): CheckboxProps {
		const nextInsert = this.checked ? '[ ]' : '[x]';
		return {
			checked: this.checked,
			onToggle: () =>
				view.dispatch({
					changes: { from: this.markerFrom, to: this.markerTo, insert: nextInsert }
				})
		};
	}

	eq(other: CheckboxWidget) {
		return (
			other.checked === this.checked &&
			other.markerFrom === this.markerFrom &&
			other.markerTo === this.markerTo
		);
	}
}

function processCheckboxLine(line: Line, ranges: Range<Decoration>[]) {
	const match = CHECKBOX_RE.exec(line.text);
	if (!match) return;

	const checked = match[1] !== ' ';
	const bracketOffset = line.text.indexOf('[');
	const markerFrom = line.from + bracketOffset;
	const markerTo = markerFrom + 3; // "[ ]" / "[x]" are 3 chars
	const textStart = markerTo + 1; // skip space after "]"

	ranges.push(
		Decoration.replace({ widget: new CheckboxWidget(checked, markerFrom, markerTo) }).range(
			line.from,
			textStart
		)
	);

	if (checked) {
		ranges.push(
			Decoration.mark({
				attributes: { style: 'opacity:0.6;text-decoration:line-through' }
			}).range(textStart, line.to)
		);
	}
}

export function mdCheckboxPlugin(mode: MarkMode): Extension {
	return Prec.high(
		StateField.define<DecorationSet>({
			create(state) {
				return buildLineDecos(mode, state, processCheckboxLine);
			},
			update(decos, tr) {
				if (tr.docChanged || tr.selection) return buildLineDecos(mode, tr.state, processCheckboxLine);
				return decos.map(tr.changes);
			},
			provide(field) {
				return EditorView.decorations.from(field);
			}
		})
	);
}
