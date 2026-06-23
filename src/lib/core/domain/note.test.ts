import { describe, it, expect } from 'vitest';
import { Note, newNoteContent } from './note';
import { UNTAGGED_FILTER } from './tag';

const SQLITE_UTC = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── create ─────────────────────────────────────────────────────────────────

describe('Note.create', () => {
	it('derives title, preview, and tags from content', () => {
		const note = Note.create('### Title line\n\nSome body text #work #home', []);
		expect(note.title).toBe('Title line');
		expect(note.preview).toBe('Some body text #work #home');
		expect(note.tags).toEqual(['work', 'home']);
	});

	it('mints a fresh uuid and stamps createdAt === updatedAt', () => {
		const note = Note.create('hello', []);
		expect(note.id).toMatch(UUID);
		expect(note.createdAt).toMatch(SQLITE_UTC);
		expect(note.updatedAt).toBe(note.createdAt);
	});

	it('allows empty content (no not-empty guard)', () => {
		const note = Note.create('', []);
		expect(note.title).toBe('');
		expect(note.preview).toBe('');
		expect(note.tags).toEqual([]);
	});

	it('honours id / timestamp / flag overrides', () => {
		const note = Note.create('hi', [], {
			id: 'fixed',
			createdAt: '2025-01-01 09:00:00',
			updatedAt: '2025-01-02 10:00:00',
			pinned: true,
			archived: true
		});
		expect(note.id).toBe('fixed');
		expect(note.createdAt).toBe('2025-01-01 09:00:00');
		expect(note.updatedAt).toBe('2025-01-02 10:00:00');
		expect(note.pinned).toBe(true);
		expect(note.archived).toBe(true);
	});
});

// ─── withContent ──────────────────────────────────────────────────────────────

describe('Note.withContent', () => {
	it('re-derives title / preview / tags and preserves id, creation time, flags', () => {
		const original = Note.create('### A\n\n#old', [], {
			id: 'n1',
			createdAt: '2020-01-01 00:00:00',
			updatedAt: '2020-01-01 00:00:00',
			pinned: true
		});
		const edited = original.withContent('### B\n\n#new', []);
		expect(edited.id).toBe('n1');
		expect(edited.title).toBe('B');
		expect(edited.tags).toEqual(['new']);
		expect(edited.pinned).toBe(true);
		expect(edited.createdAt).toBe('2020-01-01 00:00:00');
	});

	it('bumps updatedAt off the stored value', () => {
		const original = Note.create('a', [], { updatedAt: '2020-01-01 00:00:00' });
		const edited = original.withContent('b', []);
		expect(edited.updatedAt).not.toBe('2020-01-01 00:00:00');
		expect(edited.updatedAt).toMatch(SQLITE_UTC);
	});
});

// ─── buildFile / fromFile round-trip ──────────────────────────────────────────

describe('buildFile / fromFile', () => {
	const note = Note.create('### Heading\n\nSome body #tag', [], {
		id: 'fixed-id',
		createdAt: '2025-03-01 10:00:00',
		updatedAt: '2025-03-02 11:00:00',
		pinned: true
	});

	it('writes the exact on-disk frontmatter format', () => {
		expect(note.buildFile()).toBe(
			'---\n' +
				'id: fixed-id\n' +
				'pinned: true\n' +
				'archived: false\n' +
				'created_at: 2025-03-01 10:00:00\n' +
				'updated_at: 2025-03-02 11:00:00\n' +
				'---\n' +
				'### Heading\n\nSome body #tag'
		);
	});

	it('round-trips the persisted fields back through fromFile', () => {
		const back = Note.fromFile(note.buildFile());
		expect(back.id).toBe('fixed-id');
		expect(back.content).toBe('### Heading\n\nSome body #tag');
		expect(back.pinned).toBe(true);
		expect(back.archived).toBe(false);
		expect(back.createdAt).toBe('2025-03-01 10:00:00');
		expect(back.updatedAt).toBe('2025-03-02 11:00:00');
		expect(back.title).toBe('Heading');
		expect(back.tags).toEqual(['tag']);
	});

	it('preserves a body that itself contains a --- rule', () => {
		const withRule = Note.create('### T\n\nabove\n---\nbelow', [], { id: 'r1' });
		expect(Note.fromFile(withRule.buildFile()).content).toBe('### T\n\nabove\n---\nbelow');
	});

	it('returns the raw text as content when there is no frontmatter', () => {
		expect(Note.fromFile('no frontmatter here').content).toBe('no frontmatter here');
	});
});

// ─── list-item projection ─────────────────────────────────────────────────────

describe('toListItem / fromListItem', () => {
	it('projects to a content-free list item', () => {
		const note = Note.create('### T\n\n#x', [], {
			id: 'a',
			createdAt: '2025-01-01 00:00:00',
			updatedAt: '2025-01-01 00:00:00'
		});
		expect(note.toListItem()).toEqual({
			id: 'a',
			title: 'T',
			preview: '#x',
			pinned: false,
			archived: false,
			createdAt: '2025-01-01 00:00:00',
			updatedAt: '2025-01-01 00:00:00'
		});
	});

	it('reconstitutes the shell from a list item (empty content/tags)', () => {
		const item = {
			id: 'a',
			title: 'T',
			preview: 'p',
			pinned: true,
			archived: false,
			createdAt: '2025-01-01 00:00:00',
			updatedAt: '2025-01-02 00:00:00'
		};
		const note = Note.fromListItem(item);
		expect(note.id).toBe('a');
		expect(note.pinned).toBe(true);
		expect(note.createdAt).toBe('2025-01-01 00:00:00');
		expect(note.content).toBe('');
		expect(note.tags).toEqual([]);
	});
});

// ─── newNoteContent ───────────────────────────────────────────────────────────

describe('newNoteContent', () => {
	it('emits only the heading when no tag is active', () => {
		expect(newNoteContent('New Note', null)).toBe('### New Note\n\n');
	});

	it('appends the active tag as a hashtag', () => {
		expect(newNoteContent('New Note', 'work')).toBe('### New Note\n\n#work\n\n');
	});

	it('does not append the untagged sentinel as a tag', () => {
		expect(newNoteContent('New Note', UNTAGGED_FILTER)).toBe('### New Note\n\n');
	});
});
