import { describe, it, expect } from 'vitest';
import { parseAllHashtags } from './tag-parser';

describe('parseAllHashtags', () => {
	it('returns empty array for empty string', () => {
		expect(parseAllHashtags('')).toEqual([]);
	});

	it('returns empty array when no hashtags are present', () => {
		expect(parseAllHashtags('just some plain text')).toEqual([]);
	});

	it('ignores single-character hashtags (minimum 2 chars)', () => {
		expect(parseAllHashtags('#a')).toEqual([]);
	});

	it('parses a simple hashtag', () => {
		const result = parseAllHashtags('#hello');
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ name: 'hello', param: undefined, index: 0, length: 6 });
	});

	it('parses a hashtag with a parameter', () => {
		const result = parseAllHashtags('#tag(value)');
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ name: 'tag', param: 'value', index: 0, length: 11 });
	});

	it('parses hashtags with numbers and slashes', () => {
		const result = parseAllHashtags('#project/sub1');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('project/sub1');
	});

	it('parses multiple hashtags in a single string', () => {
		const result = parseAllHashtags('note with #foo and #bar');
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('foo');
		expect(result[1].name).toBe('bar');
	});

	it('records the correct index for each match', () => {
		const text = 'text #alpha and #beta';
		const result = parseAllHashtags(text);
		expect(result[0].index).toBe(5);
		expect(result[1].index).toBe(16);
	});

	it('records the correct length for each match', () => {
		const result = parseAllHashtags('#hello(world)');
		expect(result[0].length).toBe('#hello(world)'.length);
	});

	it('returns undefined param when no parentheses', () => {
		const result = parseAllHashtags('#notag');
		expect(result[0].param).toBeUndefined();
	});

	it('handles hashtag at end of string', () => {
		const result = parseAllHashtags('note #end');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('end');
	});
});
