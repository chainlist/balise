import { SettingsSection } from './base.svelte';
import {
	DEFAULT_NOTE_TEMPLATES_SETTINGS,
	type NoteTemplatesSettings,
	type NoteTemplate
} from '$lib/domain/settings';

export class NoteTemplatesSettingsSection extends SettingsSection<NoteTemplatesSettings> {
	readonly key = 'noteTemplates';
	state = $state<NoteTemplatesSettings>({ ...DEFAULT_NOTE_TEMPLATES_SETTINGS, templates: [] });

	/** Replace the whole list. A default pointing at a template that is no longer
	 *  in the list is cleared here, so the stored id never dangles. */
	setTemplates(templates: NoteTemplate[]): void {
		this.state.templates = templates;
		if (!templates.some((t) => t.id === this.state.defaultTemplateId))
			this.state.defaultTemplateId = null;
		this.persist();
	}

	setDefaultTemplate(id: string | null): void {
		this.state.defaultTemplateId = id;
		this.persist();
	}
}
