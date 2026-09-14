import { settingsService } from '$lib/services/settings/settings.svelte';
import { newNoteContent } from '$lib/domain/note';
import { findTemplate, renderTemplate, type NoteTemplate } from '$lib/domain/template';
import { formatDate } from '$lib/domain/datetime';
import * as m from '$paraglide/messages.js';

// Application layer: the one place that turns the stored templates into the seed
// content of a new note. It sequences only (read the section state, resolve the
// placeholder values, hand both to the pure domain); the substitution rules and
// the heading/tag composition live in `domain/template` and `domain/note`.
export const templatesService = {
	get templates(): NoteTemplate[] {
		return settingsService.noteTemplates.state.templates;
	},

	/** The template new notes use when none is picked explicitly. */
	get defaultTemplate(): NoteTemplate | null {
		return findTemplate(this.templates, settingsService.noteTemplates.state.defaultTemplateId);
	},

	/** Seed content for a new note under `activeTag`, from `template`. Pass `null`
	 *  for the plain heading stub. */
	buildContent(activeTag: string | null, template: NoteTemplate | null): string {
		const title = m.note_new_title();
		const { dateFormat, language } = settingsService.general.state;
		const body = template
			? renderTemplate(template.body, {
					title,
					date: formatDate(new Date(), dateFormat, language)
				})
			: undefined;
		return newNoteContent(title, activeTag, body);
	},

	/** Seed content using the configured default template, if any. */
	defaultContent(activeTag: string | null): string {
		return this.buildContent(activeTag, this.defaultTemplate);
	}
};
