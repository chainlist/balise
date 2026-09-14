import { describe, it, expect } from 'vitest';
import { createTemplate, findTemplate, renderTemplate, type NoteTemplate } from './template';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CTX = { date: '12 May 2026', title: 'New Note' };

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
	it('substitutes every date and title occurrence', () => {
		expect(renderTemplate('# {{title}} - {{date}}\n\n{{date}}', CTX)).toBe(
			'# New Note - 12 May 2026\n\n12 May 2026'
		);
	});

	it('leaves unknown tokens and literal braces alone', () => {
		expect(renderTemplate('{{author}} {not a token}', CTX)).toBe('{{author}} {not a token}');
	});

	it('returns a body without placeholders unchanged', () => {
		expect(renderTemplate('### Standup\n\n- [ ] ', CTX)).toBe('### Standup\n\n- [ ] ');
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
