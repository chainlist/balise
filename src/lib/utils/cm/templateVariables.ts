import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Extension, Range } from '@codemirror/state';
import type { CompletionSource } from '@codemirror/autocomplete';
import { makePlugin } from './shared';

/** One `{{name}}` offered in the editor, with the short description shown next
 *  to it. The description is a translated string, so the caller supplies it. */
export interface TemplateVariableOption {
	name: string;
	description: string;
}

// A `{{name}}` token, matching what `domain/template` expands.
const TOKEN = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

/** Completions for the `{{` prefix. The apply step swallows the `}}` that
 *  `closeBrackets` inserts while typing, so the token is never doubled. */
function variableCompletions(options: readonly TemplateVariableOption[]): CompletionSource {
	return (context) => {
		const word = context.matchBefore(/\{\{\s*[a-zA-Z]*/);
		if (!word) return null;

		return {
			from: word.from,
			options: options.map(({ name, description }) => {
				const token = `{{${name}}}`;
				return {
					label: token,
					detail: description,
					type: 'variable',
					apply: (view: EditorView, _c: unknown, from: number, to: number) => {
						const trailing = /^\}{1,2}/.exec(view.state.sliceDoc(to, to + 2))?.[0].length ?? 0;
						view.dispatch({
							changes: { from, to: to + trailing, insert: token },
							selection: { anchor: from + token.length }
						});
					}
				};
			})
		};
	};
}

/** Decorate the known `{{name}}` tokens so a template body shows at a glance
 *  which ones will be substituted; a typo simply stays unstyled. */
function buildVariableDecos(names: ReadonlySet<string>) {
	return (view: EditorView): DecorationSet => {
		const ranges: Range<Decoration>[] = [];
		for (const { from: vFrom, to: vTo } of view.visibleRanges) {
			const text = view.state.doc.sliceString(vFrom, vTo);
			TOKEN.lastIndex = 0;
			let m: RegExpExecArray | null;
			while ((m = TOKEN.exec(text)) !== null) {
				if (!names.has(m[1].toLowerCase())) continue;
				const from = vFrom + m.index;
				ranges.push(Decoration.mark({ class: 'cm-template-var' }).range(from, from + m[0].length));
			}
		}
		return Decoration.set(ranges);
	};
}

const templateVarTheme = EditorView.theme({
	'.cm-template-var': {
		background: 'var(--muted)',
		color: 'var(--primary)',
		borderRadius: '3px',
		padding: '0 2px',
		fontFamily: 'var(--font-mono, monospace)',
		fontSize: '0.9em'
	}
});

/** Editor support for template bodies: the `{{` suggestions and the token
 *  styling. Returns the completion source separately because the editor merges
 *  every source into one `autocompletion()` call. */
export function mdTemplateVariables(options: readonly TemplateVariableOption[]): {
	completion: CompletionSource;
	extension: Extension;
} {
	const names = new Set(options.map((o) => o.name.toLowerCase()));
	return {
		completion: variableCompletions(options),
		extension: [makePlugin(buildVariableDecos(names), { selection: false }), templateVarTheme]
	};
}
