import { StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import type { Range } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import CodeBlock from '$lib/components/cm/CodeBlock.svelte';
import { SvelteWidget } from './shared';

class CodeBlockWidget extends SvelteWidget<{ lang: string; code: string }> {
	protected component = CodeBlock;
	protected override tagName = 'div' as const;
	// Allow clicks through so CodeMirror places the cursor and triggers edit mode
	protected override ignoreEvents = false;
	constructor(
		readonly lang: string,
		readonly code: string
	) {
		super();
	}
	protected getProps() {
		return { lang: this.lang, code: this.code };
	}
	eq(other: CodeBlockWidget) {
		return other.lang === this.lang && other.code === this.code;
	}
}

function buildCodeDecos(state: EditorState): DecorationSet {
	const cursorPos = state.selection.main.head;
	const ranges: Range<Decoration>[] = [];

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'FencedCode') return;
			// Cursor anywhere inside the block → show raw markdown for editing
			if (cursorPos >= node.from && cursorPos <= node.to) return false;

			let lang = '';
			const openLine = state.doc.lineAt(node.from);
			const closeLine = state.doc.lineAt(node.to);

			for (let child = node.node.firstChild; child; child = child.nextSibling) {
				if (child.name === 'CodeInfo') {
					lang = state.doc.sliceString(child.from, child.to);
				}
			}

			const code = state.doc.sliceString(openLine.to + 1, closeLine.from).trimEnd();
			const to = Math.min(closeLine.to + 1, state.doc.length);
			ranges.push(
				Decoration.replace({ widget: new CodeBlockWidget(lang, code), block: true }).range(
					openLine.from,
					to
				)
			);

			return false;
		}
	});

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

export const mdCodePlugin = StateField.define<DecorationSet>({
	create(state) {
		return buildCodeDecos(state);
	},
	update(decos, tr) {
		if (tr.docChanged || tr.selection) {
			return buildCodeDecos(tr.state);
		}
		return decos.map(tr.changes);
	},
	provide(field) {
		return EditorView.decorations.from(field);
	}
});
