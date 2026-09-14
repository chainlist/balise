import { settingsService } from '$lib/services/settings/settings.svelte';
import { notesService } from '$lib/services/notes.svelte';
import { newNoteContent } from '$lib/domain/note';
import {
	findTemplate,
	renderTemplate,
	type NoteTemplate,
	type TemplateValues
} from '$lib/domain/template';
import { isFilterSentinel } from '$lib/domain/tag';
import { newId } from '$lib/domain/shared/id';
import { formatDate } from '$lib/domain/datetime';
import * as m from '$paraglide/messages.js';

// Application layer: the one place that turns the stored templates into a new
// note. It sequences only (read the section state, resolve the variable values,
// hand both to the pure domain, then persist); the substitution rules and the
// heading/tag composition live in `domain/template` and `domain/note`.

/** Where the caret should land in the note we just created, keyed by its id so a
 *  stale offset can never be applied to a note the user opened by hand. */
let pendingCursor: { noteId: string; pos: number } | null = null;

export const templatesService = {
	get templates(): NoteTemplate[] {
		return settingsService.noteTemplates.state.templates;
	},

	/** The template new notes use when none is picked explicitly. */
	get defaultTemplate(): NoteTemplate | null {
		return findTemplate(this.templates, settingsService.noteTemplates.state.defaultTemplateId);
	},

	/** Everything a `{{name}}` can expand to right now. A sentinel filter is not a
	 *  real tag, so `{{tag}}` is empty under one. */
	values(activeTag: string | null): TemplateValues {
		const { dateFormat, language } = settingsService.general.state;
		const now = new Date();
		const time = new Intl.DateTimeFormat(language, { timeStyle: 'short' }).format(now);
		const date = formatDate(now, dateFormat, language);
		return {
			title: m.note_new_title(),
			date,
			time,
			datetime: `${date} ${time}`,
			weekday: new Intl.DateTimeFormat(language, { weekday: 'long' }).format(now),
			month: new Intl.DateTimeFormat(language, { month: 'long' }).format(now),
			year: String(now.getFullYear()),
			tag: activeTag && !isFilterSentinel(activeTag) ? activeTag : ''
		};
	},

	/** Seed content for a new note under `activeTag`, from `template`. Pass `null`
	 *  for the plain heading stub. */
	render(activeTag: string | null, template: NoteTemplate | null) {
		const values = this.values(activeTag);
		const body = template ? renderTemplate(template.body, values) : null;
		const content = newNoteContent(values.title, activeTag, body?.text);
		// `newNoteContent` prepends nothing, so a body offset is already a content
		// offset. It does trim the body's trailing newlines though, hence the clamp.
		const cursor = body?.cursor != null ? Math.min(body.cursor, content.length) : null;
		return { content, cursor };
	},

	/** Create a note seeded by `template` (or the plain stub for `null`) and
	 *  remember where its `{{cursor}}` marker was, for the editor about to open.
	 *
	 *  The id is minted here rather than by `notesService`, because the claim has
	 *  to be staked before the note reaches the note list: the list feeds
	 *  `uiState.activeNoteId`, which opens the editor, which reads the claim. */
	async create(activeTag: string | null, template: NoteTemplate | null): Promise<string> {
		const { content, cursor } = this.render(activeTag, template);
		const id = newId();
		pendingCursor = cursor === null ? null : { noteId: id, pos: cursor };
		return notesService.create(content, id);
	},

	/** Create a note from the configured default template, if any. */
	async createDefault(activeTag: string | null): Promise<string> {
		return this.create(activeTag, this.defaultTemplate);
	},

	/** Read-and-clear the caret offset left by {@link create}. `null` for any note
	 *  that was not just created from a template carrying a `{{cursor}}`. */
	takeCursor(noteId: string): number | null {
		if (pendingCursor?.noteId !== noteId) return null;
		const { pos } = pendingCursor;
		pendingCursor = null;
		return pos;
	}
};
