import type { EditorView } from '@codemirror/view';
import * as m from '$paraglide/messages.js';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { formatDate } from '$lib/domain/datetime';
import { insertImageAtCursor, insertOrReplaceCover } from '$lib/utils/cm/imageActions';

export const SlashCategory = {
	Headings: 'headings',
	Lists: 'lists',
	Tags: 'tags',
	Callouts: 'callouts',
	Insert: 'insert',
	Date: 'date'
} as const;
export type SlashCategory = (typeof SlashCategory)[keyof typeof SlashCategory];

/** Ordered tabs shown at the top of the slash menu. */
export const SLASH_CATEGORIES: { id: SlashCategory; label: string }[] = [
	{ id: SlashCategory.Headings, label: m.slash_cat_headings() },
	{ id: SlashCategory.Lists, label: m.slash_cat_lists() },
	{ id: SlashCategory.Tags, label: m.slash_cat_tags() },
	{ id: SlashCategory.Callouts, label: m.slash_cat_callouts() },
	{ id: SlashCategory.Insert, label: m.slash_cat_insert() },
	{ id: SlashCategory.Date, label: m.slash_cat_date() }
];

export interface SlashAction {
	id: string;
	label: string;
	description: string;
	category: SlashCategory;
	/** Text to insert in place of the slash command. A function is evaluated at
	 *  selection time (e.g. for a date that depends on the current settings).
	 *  Omit when the action drives the editor itself via `run`. */
	insert?: string | (() => string);
	/** Imperative handler for actions that need the editor view and async work
	 *  (e.g. picking a file). Receives the range of the typed `/command` to
	 *  replace; the handler owns every edit from there. */
	run?: (view: EditorView, range: { from: number; to: number }) => void;
	keywords: string[];
	icon: string;
}

export const SLASH_ACTIONS: SlashAction[] = [
	{
		id: 'h1',
		category: SlashCategory.Headings,
		label: m.slash_h1_label(),
		description: m.slash_h1_desc(),
		insert: '# ',
		keywords: ['heading', 'title', 'h1'],
		icon: 'H1'
	},
	{
		id: 'h2',
		category: SlashCategory.Headings,
		label: m.slash_h2_label(),
		description: m.slash_h2_desc(),
		insert: '## ',
		keywords: ['heading', 'title', 'h2'],
		icon: 'H2'
	},
	{
		id: 'h3',
		category: SlashCategory.Headings,
		label: m.slash_h3_label(),
		description: m.slash_h3_desc(),
		insert: '### ',
		keywords: ['heading', 'title', 'h3'],
		icon: 'H3'
	},
	{
		id: 'bullet',
		category: SlashCategory.Lists,
		label: m.slash_bullet_label(),
		description: m.slash_bullet_desc(),
		insert: '- ',
		keywords: ['bullet', 'list', 'ul'],
		icon: '•'
	},
	{
		id: 'numbered',
		category: SlashCategory.Lists,
		label: m.slash_numbered_label(),
		description: m.slash_numbered_desc(),
		insert: '1. ',
		keywords: ['numbered', 'ordered', 'ol'],
		icon: '1.'
	},
	{
		id: 'checklist',
		category: SlashCategory.Lists,
		label: m.slash_checklist_label(),
		description: m.slash_checklist_desc(),
		insert: '- [ ] ',
		keywords: ['checklist', 'checkbox', 'check'],
		icon: '☐'
	},
	{
		id: 'todo',
		category: SlashCategory.Tags,
		label: m.slash_todo_label(),
		description: m.slash_todo_desc(),
		insert: '#todo ',
		keywords: ['todo', 'task'],
		icon: '○'
	},
	{
		id: 'inprogress',
		category: SlashCategory.Tags,
		label: m.slash_inprogress_label(),
		description: m.slash_inprogress_desc(),
		insert: '#inprogress ',
		keywords: ['inprogress', 'progress', 'wip'],
		icon: '◑'
	},
	{
		id: 'done',
		category: SlashCategory.Tags,
		label: m.slash_done_label(),
		description: m.slash_done_desc(),
		insert: '#done ',
		keywords: ['done', 'complete'],
		icon: '✓'
	},
	{
		id: 'quote',
		category: SlashCategory.Callouts,
		label: m.slash_quote_label(),
		description: m.slash_quote_desc(),
		insert: '> ',
		keywords: ['quote', 'blockquote'],
		icon: '"'
	},
	{
		id: 'signal-note',
		category: SlashCategory.Callouts,
		label: m.slash_signal_note_label(),
		description: m.slash_signal_note_desc(),
		insert: '> [!NOTE]\n> ',
		keywords: ['signal', 'note', 'callout', 'info'],
		icon: 'ℹ'
	},
	{
		id: 'signal-tip',
		category: SlashCategory.Callouts,
		label: m.slash_signal_tip_label(),
		description: m.slash_signal_tip_desc(),
		insert: '> [!TIP]\n> ',
		keywords: ['signal', 'tip', 'callout', 'hint'],
		icon: '💡'
	},
	{
		id: 'signal-important',
		category: SlashCategory.Callouts,
		label: m.slash_signal_important_label(),
		description: m.slash_signal_important_desc(),
		insert: '> [!IMPORTANT]\n> ',
		keywords: ['signal', 'important', 'callout'],
		icon: '❗'
	},
	{
		id: 'signal-warning',
		category: SlashCategory.Callouts,
		label: m.slash_signal_warning_label(),
		description: m.slash_signal_warning_desc(),
		insert: '> [!WARNING]\n> ',
		keywords: ['signal', 'warning', 'callout', 'warn'],
		icon: '⚠'
	},
	{
		id: 'signal-caution',
		category: SlashCategory.Callouts,
		label: m.slash_signal_caution_label(),
		description: m.slash_signal_caution_desc(),
		insert: '> [!CAUTION]\n> ',
		keywords: ['signal', 'caution', 'callout', 'danger'],
		icon: '🛑'
	},
	{
		id: 'code',
		category: SlashCategory.Insert,
		label: m.slash_code_label(),
		description: m.slash_code_desc(),
		insert: '```\n',
		keywords: ['code', 'block', 'fence'],
		icon: '</>'
	},
	{
		id: 'divider',
		category: SlashCategory.Insert,
		label: m.slash_divider_label(),
		description: m.slash_divider_desc(),
		insert: '---\n',
		keywords: ['divider', 'separator', 'hr'],
		icon: '—'
	},
	{
		id: 'table',
		category: SlashCategory.Insert,
		label: m.slash_table_label(),
		description: m.slash_table_desc(),
		// Named headers, not empty ones: all-empty header cells are the "no
		// header row" convention (see table-model.ts), and a fresh table should
		// start with a header row. The trailing newline drops the cursor below
		// the table so the widget renders immediately.
		insert: () =>
			[
				`| ${m.slash_table_column({ n: 1 })} | ${m.slash_table_column({ n: 2 })} |`,
				'| --- | --- |',
				'|  |  |',
				'|  |  |',
				''
			].join('\n'),
		keywords: ['table', 'grid', 'rows', 'columns'],
		icon: '▦'
	},
	{
		id: 'image',
		category: SlashCategory.Insert,
		label: m.slash_image_label(),
		description: m.slash_image_desc(),
		run: insertImageAtCursor,
		keywords: ['image', 'img', 'picture', 'photo'],
		icon: '🖼'
	},
	{
		id: 'cover',
		category: SlashCategory.Insert,
		label: m.slash_cover_label(),
		description: m.slash_cover_desc(),
		run: insertOrReplaceCover,
		keywords: ['cover', 'banner', 'header', 'hero'],
		icon: '📸'
	},
	{
		id: 'date-now',
		category: SlashCategory.Date,
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
		category: SlashCategory.Date,
		label: m.slash_insert_date_label(),
		description: m.slash_insert_date_desc(),
		insert: '@',
		keywords: ['date', 'calendar', 'pick', 'insert'],
		icon: '📆'
	}
];
