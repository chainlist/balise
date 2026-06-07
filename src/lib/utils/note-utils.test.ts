import { describe, it, expect } from 'vitest';
import { extractTitle, notePreview } from './note-utils';

describe('extractTitle', () => {
	it('returns empty string for empty content', () => {
		expect(extractTitle('')).toBe('');
	});

	it('returns empty string for whitespace-only content', () => {
		expect(extractTitle('   \n  \n  ')).toBe('');
	});

	it('returns first non-empty line as-is', () => {
		expect(extractTitle('Hello world')).toBe('Hello world');
	});

	it('strips h1 heading marker', () => {
		expect(extractTitle('# My Title')).toBe('My Title');
	});

	it('strips h2 through h6 heading markers', () => {
		expect(extractTitle('## Section')).toBe('Section');
		expect(extractTitle('### Sub')).toBe('Sub');
		expect(extractTitle('###### Deep')).toBe('Deep');
	});

	it('skips leading blank lines', () => {
		expect(extractTitle('\n\nFirst line')).toBe('First line');
	});

	it('returns only the first non-empty line', () => {
		expect(extractTitle('First\nSecond\nThird')).toBe('First');
	});

	it('trims surrounding whitespace from the matched line', () => {
		expect(extractTitle('  trimmed  ')).toBe('trimmed');
	});
});

describe('notePreview', () => {
	it('returns empty string for empty content', () => {
		expect(notePreview('')).toBe('');
	});

	it('returns empty string when content is only the title', () => {
		expect(notePreview('# Title')).toBe('');
	});

	it('returns body text after a heading title', () => {
		expect(notePreview('# Title\nSome body text')).toBe('Some body text');
	});

	it('returns body text after a plain-text title', () => {
		expect(notePreview('Title\nBody content')).toBe('Body content');
	});

	it('trims leading/trailing whitespace from body', () => {
		expect(notePreview('# Title\n\n  Body  ')).toBe('Body');
	});

	it('truncates body to 140 characters', () => {
		const body = 'a'.repeat(200);
		expect(notePreview(`# Title\n${body}`)).toBe('a'.repeat(140));
	});

	it('does not truncate body shorter than 140 characters', () => {
		const body = 'short body';
		expect(notePreview(`# Title\n${body}`)).toBe(body);
	});
});
