import { StateField } from '@codemirror/state';
import type { EditorState, Range } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isMarkRevealed, type MarkMode } from './shared';

// Obsidian-style fenced code: the block stays as live, editable text. We paint a
// per-line background across the fenced range (begin/end lines get rounded
// corners). The opening/closing ``` lines stay as rows in the panel, but their
// ``` + language glyphs are hidden (mode-dependent) by replacing the text while
// keeping the line. Token colors come from the syntax highlighter, since the
// markdown parser is configured with `codeLanguages`.
const hideContent = Decoration.replace({});

function buildCodeDecos(state: EditorState, mode: MarkMode): DecorationSet {
	const ranges: Range<Decoration>[] = [];
	const cursorPos = state.selection.main.head;

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'FencedCode') return;

			const startLine = state.doc.lineAt(node.from).number;
			const endLine = state.doc.lineAt(node.to).number;
			const revealed = isMarkRevealed(mode, node.from, node.to, cursorPos);

			let lang = '';
			for (let child = node.node.firstChild; child; child = child.nextSibling) {
				if (child.name === 'CodeInfo') {
					lang = state.doc.sliceString(child.from, child.to).trim();
					break;
				}
			}

			for (let n = startLine; n <= endLine; n++) {
				const line = state.doc.line(n);
				const isFence = n === startLine || n === endLine;

				let cls = 'cm-md-codeblock';
				if (n === startLine) cls += ' cm-md-codeblock-begin';
				if (n === endLine) cls += ' cm-md-codeblock-end';
				const spec: { class: string; attributes?: Record<string, string> } = { class: cls };
				if (n === startLine && lang) spec.attributes = { 'data-lang': lang };
				ranges.push(Decoration.line(spec).range(line.from));

				// Keep the fence row, but hide the ``` + language glyphs unless revealed.
				if (isFence && !revealed && line.to > line.from) {
					ranges.push(hideContent.range(line.from, line.to));
				}
			}

			return false;
		}
	});

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

export const mdCodePlugin = (mode: MarkMode) =>
	StateField.define<DecorationSet>({
		create(state) {
			return buildCodeDecos(state, mode);
		},
		update(decos, tr) {
			if (tr.docChanged || tr.selection) {
				return buildCodeDecos(tr.state, mode);
			}
			return decos.map(tr.changes);
		},
		provide(field) {
			return EditorView.decorations.from(field);
		}
	});
