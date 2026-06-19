import * as m from '$paraglide/messages.js';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { formatDate } from '$lib/utils/date-format';

export interface SlashAction {
	id: string;
	label: string;
	description: string;
	/** Text to insert in place of the slash command. A function is evaluated at
	 *  selection time (e.g. for a date that depends on the current settings). */
	insert: string | (() => string);
	keywords: string[];
	icon: string;
}

export const SLASH_ACTIONS: SlashAction[] = [
	{
		id: 'h1',
		label: m.slash_h1_label(),
		description: m.slash_h1_desc(),
		insert: '# ',
		keywords: ['heading', 'title', 'h1'],
		icon: 'H1'
	},
	{
		id: 'h2',
		label: m.slash_h2_label(),
		description: m.slash_h2_desc(),
		insert: '## ',
		keywords: ['heading', 'title', 'h2'],
		icon: 'H2'
	},
	{
		id: 'h3',
		label: m.slash_h3_label(),
		description: m.slash_h3_desc(),
		insert: '### ',
		keywords: ['heading', 'title', 'h3'],
		icon: 'H3'
	},
	{
		id: 'bullet',
		label: m.slash_bullet_label(),
		description: m.slash_bullet_desc(),
		insert: '- ',
		keywords: ['bullet', 'list', 'ul'],
		icon: '•'
	},
	{
		id: 'numbered',
		label: m.slash_numbered_label(),
		description: m.slash_numbered_desc(),
		insert: '1. ',
		keywords: ['numbered', 'ordered', 'ol'],
		icon: '1.'
	},
	{
		id: 'checklist',
		label: m.slash_checklist_label(),
		description: m.slash_checklist_desc(),
		insert: '- [ ] ',
		keywords: ['checklist', 'checkbox', 'check'],
		icon: '☐'
	},
	{
		id: 'todo',
		label: m.slash_todo_label(),
		description: m.slash_todo_desc(),
		insert: '#todo ',
		keywords: ['todo', 'task'],
		icon: '○'
	},
	{
		id: 'inprogress',
		label: m.slash_inprogress_label(),
		description: m.slash_inprogress_desc(),
		insert: '#inprogress ',
		keywords: ['inprogress', 'progress', 'wip'],
		icon: '◑'
	},
	{
		id: 'done',
		label: m.slash_done_label(),
		description: m.slash_done_desc(),
		insert: '#done ',
		keywords: ['done', 'complete'],
		icon: '✓'
	},
	{
		id: 'quote',
		label: m.slash_quote_label(),
		description: m.slash_quote_desc(),
		insert: '> ',
		keywords: ['quote', 'blockquote'],
		icon: '"'
	},
	{
		id: 'code',
		label: m.slash_code_label(),
		description: m.slash_code_desc(),
		insert: '```\n',
		keywords: ['code', 'block', 'fence'],
		icon: '</>'
	},
	{
		id: 'divider',
		label: m.slash_divider_label(),
		description: m.slash_divider_desc(),
		insert: '---\n',
		keywords: ['divider', 'separator', 'hr'],
		icon: '—'
	},
	{
		id: 'date-now',
		label: m.slash_date_now_label(),
		description: m.slash_date_now_desc(),
		insert: () =>
			formatDate(
				new Date(),
				settingsService.general.state.dateFormat,
				settingsService.general.state.language
			),
		keywords: ['date', 'today', 'now'],
		icon: '📅'
	},
	{
		// Inserts `@`, which the date-picker plugin reacts to by opening the calendar.
		id: 'insert-date',
		label: m.slash_insert_date_label(),
		description: m.slash_insert_date_desc(),
		insert: '@',
		keywords: ['date', 'calendar', 'pick', 'insert'],
		icon: '📆'
	}
];
