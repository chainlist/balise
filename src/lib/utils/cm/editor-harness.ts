// Test-only helper (no `.test` suffix, so neither vitest project collects it as a
// suite). Builds a real EditorView with the markdown language + a chosen set of
// editor plugins, and exposes small utilities to drive it and read what the user
// actually sees. Browser-project tests (`*.svelte.test.ts`) import this; it relies
// on the DOM, so it must not be imported from node-project tests.
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { ensureSyntaxTree } from '@codemirror/language';

import { mdHidePlugin } from './hidePlugin';
import { mdMarkNavPlugin } from './markNavPlugin';
import { mdCodePlugin } from './codePlugin';
import { mdBulletPlugin } from './bulletPlugin';
import { mdHrPlugin } from './hrPlugin';
import { mdHeaderPlugin } from './headerPlugin';
import { mdQuotePlugin } from './quotePlugin';
import { mdHighlightPlugin } from './highlightPlugin';
import { mdUnderlinePlugin } from './underlinePlugin';
import { spaceRequiredHeadings } from './headingParser';
import type { MarkMode } from './shared';

export const mdLanguage = markdown({
	base: markdownLanguage,
	extensions: [GFM, spaceRequiredHeadings, { remove: ['SetextHeading'] }]
});

// The decoration/concealment plugins that are safe to mount in a bare view (no app
// services, no Svelte component widgets). Mirrors the relevant slice of Editor.svelte's
// makeMarkPlugins. Widget/service-backed plugins (link, tag, checkbox, task, embed,
// slash, datePicker, toolbar) are intentionally excluded — their recognition logic is
// covered by node tests against the underlying parsers/patterns.
export function markPlugins(mode: MarkMode): Extension[] {
	return [
		mdHidePlugin(mode),
		mdMarkNavPlugin(mode),
		mdCodePlugin(mode),
		mdBulletPlugin(mode),
		mdHrPlugin(mode),
		mdHeaderPlugin(mode),
		mdQuotePlugin(mode),
		mdHighlightPlugin(mode),
		mdUnderlinePlugin(mode)
	];
}

export type MountOptions = {
	mode?: MarkMode;
	/** Extra extensions on top of the language (e.g. format keymap). Defaults to markPlugins(mode). */
	extensions?: Extension[];
	cursor?: number;
};

export function mountEditor(doc: string, opts: MountOptions = {}): EditorView {
	const mode = opts.mode ?? 'cursor';
	const parent = document.createElement('div');
	// A real size so CodeMirror renders every line of small test docs.
	parent.style.cssText = 'height:600px;width:800px;overflow:auto';
	document.body.appendChild(parent);

	const state = EditorState.create({
		doc,
		selection: opts.cursor != null ? { anchor: opts.cursor } : undefined,
		extensions: [
			EditorView.lineWrapping,
			mdLanguage,
			...(opts.extensions ?? markPlugins(mode))
		]
	});
	ensureSyntaxTree(state, doc.length, 5000);
	return new EditorView({ parent, state });
}

export function destroy(view: EditorView): void {
	const parent = view.dom.parentElement;
	view.destroy();
	parent?.remove();
}

export function setCursor(view: EditorView, pos: number): void {
	view.dispatch({ selection: { anchor: pos } });
}

export function setSelection(view: EditorView, anchor: number, head: number): void {
	view.dispatch({ selection: { anchor, head } });
}

/** The text content of each rendered `.cm-line` (replaced/hidden ranges contribute nothing). */
export function renderedLines(view: EditorView): string[] {
	return Array.from(view.contentDOM.querySelectorAll('.cm-line')).map((el) => el.textContent ?? '');
}

/** Whole-document rendered text, lines joined by `\n` — what the user sees after concealment. */
export function rendered(view: EditorView): string {
	return renderedLines(view).join('\n');
}

/** Classes on the rendered line element for a 1-based line number. */
export function lineClasses(view: EditorView, lineNumber: number): string[] {
	const el = view.contentDOM.querySelectorAll('.cm-line')[lineNumber - 1];
	return el ? Array.from(el.classList) : [];
}

/** Count of rendered elements matching a selector (e.g. '.cm-md-bullet', '.cm-md-hr'). */
export function countEls(view: EditorView, selector: string): number {
	return view.contentDOM.querySelectorAll(selector).length;
}

const MODS: Record<string, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'> = {
	Mod: 'ctrlKey', // tests run on linux/windows playwright, so Mod === Ctrl
	Ctrl: 'ctrlKey',
	Cmd: 'metaKey',
	Shift: 'shiftKey',
	Alt: 'altKey'
};

// Dispatch a real keydown so CodeMirror's keymaps run exactly as in the app.
// `combo` is CodeMirror keybinding syntax, e.g. 'ArrowRight', 'Backspace', 'Mod-b', 'Shift-Enter'.
export function pressKey(view: EditorView, combo: string): void {
	const parts = combo.split('-');
	const key = parts.pop() as string;
	const init: KeyboardEventInit = { key, bubbles: true, cancelable: true };
	for (const mod of parts) {
		const prop = MODS[mod];
		if (prop) (init as Record<string, boolean>)[prop] = true;
	}
	view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', init));
}

/** Current cursor head (collapsed selection). */
export function cursor(view: EditorView): number {
	return view.state.selection.main.head;
}

/** Current document text. */
export function docText(view: EditorView): string {
	return view.state.doc.toString();
}
