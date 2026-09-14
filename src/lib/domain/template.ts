// Note-template domain: the shape of a user-defined template, its placeholder
// substitution, and the lookup used when a note is created. Pure: no I/O, no
// Svelte, no Tauri. What a placeholder expands to (the formatted date, the
// new-note title) is passed in, so the domain never reaches for a clock, a
// locale, or a paraglide message.

import { newId } from './shared/id';

export interface NoteTemplate {
	id: string;
	name: string;
	/** Markdown seed inserted as the new note's body, placeholders included. */
	body: string;
}

/** Tokens a body may contain, expanded by {@link renderTemplate}. */
export const TEMPLATE_PLACEHOLDERS = {
	DATE: '{{date}}',
	TITLE: '{{title}}'
} as const;

/** The values {@link renderTemplate} substitutes, resolved by the caller. */
export interface TemplateContext {
	/** Today, already formatted in the user's date format and language. */
	date: string;
	/** The default new-note title. */
	title: string;
}

export function createTemplate(name: string, body = ''): NoteTemplate {
	return { id: newId(), name, body };
}

/** Expand every known placeholder. Unknown `{{...}}` tokens are left untouched,
 *  so a body can still carry literal braces. */
export function renderTemplate(body: string, ctx: TemplateContext): string {
	return body.replace(/\{\{(date|title)\}\}/g, (_, token: string) =>
		token === 'date' ? ctx.date : ctx.title
	);
}

/** The template with this id, or `null` when the id is absent or dangling (a
 *  stored default whose template has since been deleted). */
export function findTemplate(
	templates: readonly NoteTemplate[],
	id: string | null
): NoteTemplate | null {
	return (id && templates.find((t) => t.id === id)) || null;
}
