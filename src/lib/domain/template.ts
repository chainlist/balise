// Note-template domain: the shape of a user-defined template, its variable
// substitution, and the lookup used when a note is created. Pure: no I/O, no
// Svelte, no Tauri. What a variable expands to (the formatted date, the active
// tag, the new-note title) is passed in, so the domain never reaches for a
// clock, a locale, or a paraglide message.

import { newId } from './shared/id';

export interface NoteTemplate {
	id: string;
	name: string;
	/** Markdown seed inserted as the new note's body, variables included. */
	body: string;
}

/** Every `{{name}}` a body may contain. `cursor` is the odd one out: it expands
 *  to nothing and instead marks where the caret lands once the note opens. */
export const TEMPLATE_VARIABLES = [
	'title',
	'date',
	'time',
	'datetime',
	'weekday',
	'month',
	'year',
	'tag',
	'cursor'
] as const;

export type TemplateVariableName = (typeof TEMPLATE_VARIABLES)[number];

export const CURSOR_VARIABLE = 'cursor';

/** The values {@link renderTemplate} substitutes, resolved by the caller. */
export type TemplateValues = Record<Exclude<TemplateVariableName, typeof CURSOR_VARIABLE>, string>;

/** The token as it is written inside a body. */
export function templateToken(name: TemplateVariableName): string {
	return `{{${name}}}`;
}

export interface RenderedTemplate {
	text: string;
	/** Offset of the `{{cursor}}` marker in `text`, or `null` when the body has
	 *  none. Only the first marker counts; later ones are still removed. */
	cursor: number | null;
}

// A `{{name}}` token, tolerating padding so `{{ date }}` works too.
const TOKEN = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

/** Expand every known variable. Unknown `{{...}}` tokens are left untouched, so
 *  a body can still carry literal braces. */
export function renderTemplate(body: string, values: TemplateValues): RenderedTemplate {
	let text = '';
	let last = 0;
	let cursor: number | null = null;

	for (const match of body.matchAll(TOKEN)) {
		const name = match[1].toLowerCase();
		const known = name === CURSOR_VARIABLE || name in values;
		if (!known) continue;

		text += body.slice(last, match.index);
		last = match.index + match[0].length;

		if (name === CURSOR_VARIABLE) cursor ??= text.length;
		else text += values[name as keyof TemplateValues];
	}

	return { text: text + body.slice(last), cursor };
}

/** The template with this id, or `null` when the id is absent or dangling (a
 *  stored default whose template has since been deleted). */
export function findTemplate(
	templates: readonly NoteTemplate[],
	id: string | null
): NoteTemplate | null {
	return (id && templates.find((t) => t.id === id)) || null;
}

export function createTemplate(name: string, body = ''): NoteTemplate {
	return { id: newId(), name, body };
}
