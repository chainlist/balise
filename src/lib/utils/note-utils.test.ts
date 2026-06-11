import { describe, it, expect } from 'vitest';
import { extractTitle, notePreview, readingTimeMinutes } from './note-utils';

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

describe('readingTimeMinutes', () => {
	it('returns 0 for empty content', () => {
		expect(readingTimeMinutes('')).toBe(0);
	});

	it('returns 0 for whitespace-only content', () => {
		expect(readingTimeMinutes('  \n\t \n')).toBe(0);
	});

	it('returns 1 minute for short content', () => {
		expect(readingTimeMinutes('Just a few words here')).toBe(1);
	});

	it('returns 1 minute for exactly 220 words', () => {
		expect(readingTimeMinutes(Array(220).fill('word').join(' '))).toBe(1);
	});

	it('rounds to the nearest minute', () => {
		// 329 words = 89.7s -> 1 min; 330 words = 90s -> 2 min
		expect(readingTimeMinutes(Array(329).fill('word').join(' '))).toBe(1);
		expect(readingTimeMinutes(Array(330).fill('word').join(' '))).toBe(2);
	});

	it('stays at 1 min for a short note with a few images', () => {
		// 14 words (3.8s) + 3 images (30s) = 33.8s -> rounds to 1 min
		const note = `${Array(14).fill('word').join(' ')}\n![](a.png)\n![](b.png)\n![](c.png)`;
		expect(readingTimeMinutes(note)).toBe(1);
	});

	it('ignores extra whitespace and newlines', () => {
		expect(readingTimeMinutes('one\n\n  two\tthree   ')).toBe(1);
	});

	it('adds 10 seconds per image', () => {
		// 220 words = 60s, + 3 images = 30s more = 90s -> 2 min
		const words = Array(220).fill('word').join(' ');
		const images = '![a](x.png) ![b](y.png) ![](z.png)';
		expect(readingTimeMinutes(`${words}\n${images}`)).toBe(2);
	});

	it('does not count image syntax as words', () => {
		// 1 image alone = 10s -> still 1 min, alt/path text not counted as words
		expect(readingTimeMinutes('![some long alt text](path/to/image.png)')).toBe(1);
	});

	it('accumulates time for images without text', () => {
		// 9 images = 90s -> 2 min
		const images = Array(9).fill('![img](pic.png)').join('\n');
		expect(readingTimeMinutes(images)).toBe(2);
	});
});
