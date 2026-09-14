import { describe, it, expect } from 'vitest';
import {
	createTemplate,
	findTemplate,
	renderTemplate,
	templateToken,
	type NoteTemplate,
	type TemplateValues
} from './template';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALUES: TemplateValues = {
	title: 'New Note',
	date: '12 May 2026',
	time: '09:30',
	datetime: '12 May 2026 09:30',
	weekday: 'Tuesday',
	month: 'May',
	year: '2026',
	tag: 'work'
};

// ─── createTemplate ───────────────────────────────────────────────────────────

describe('createTemplate', () => {
	it('mints a fresh uuid and defaults the body to empty', () => {
		const template = createTemplate('Meeting');
		expect(template.id).toMatch(UUID);
		expect(template.name).toBe('Meeting');
		expect(template.body).toBe('');
	});
});

// ─── renderTemplate ───────────────────────────────────────────────────────────

describe('renderTemplate', () => {
	it('substitutes every occurrence of every known variable', () => {
		expect(renderTemplate('# {{title}} - {{date}}\n\n{{date}} {{weekday}}', VALUES)).toEqual({
			text: '# New Note - 12 May 2026\n\n12 May 2026 Tuesday',
			cursor: null
		});
	});

	it('tolerates padding inside the braces and is case insensitive', () => {
		expect(renderTemplate('{{ Year }}', VALUES).text).toBe('2026');
	});

	it('leaves unknown tokens and literal braces alone', () => {
		expect(renderTemplate('{{author}} {not a token}', VALUES)).toEqual({
			text: '{{author}} {not a token}',
			cursor: null
		});
	});

	it('returns a body without variables unchanged', () => {
		expect(renderTemplate('### Standup\n\n- [ ] ', VALUES).text).toBe('### Standup\n\n- [ ] ');
	});

	it('strips {{cursor}} and reports its offset in the rendered text', () => {
		expect(renderTemplate('## {{title}}\n\n{{cursor}}\n\n---', VALUES)).toEqual({
			text: '## New Note\n\n\n\n---',
			cursor: 13
		});
	});

	it('keeps the first cursor marker and still strips the later ones', () => {
		expect(renderTemplate('a{{cursor}}b{{cursor}}c', VALUES)).toEqual({ text: 'abc', cursor: 1 });
	});
});

// ─── templateToken ────────────────────────────────────────────────────────────

describe('templateToken', () => {
	it('wraps a variable name in braces', () => {
		expect(templateToken('date')).toBe('{{date}}');
	});
});

// ─── findTemplate ─────────────────────────────────────────────────────────────

describe('findTemplate', () => {
	const templates: NoteTemplate[] = [
		{ id: 'a', name: 'Meeting', body: 'x' },
		{ id: 'b', name: 'Standup', body: 'y' }
	];

	it('finds a template by id', () => {
		expect(findTemplate(templates, 'b')?.name).toBe('Standup');
	});

	it('returns null for no id', () => {
		expect(findTemplate(templates, null)).toBeNull();
	});

	it('returns null for a dangling id', () => {
		expect(findTemplate(templates, 'deleted')).toBeNull();
	});
});
