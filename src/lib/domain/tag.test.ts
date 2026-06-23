import { describe, it, expect } from 'vitest';
import {
	groupHashtagOccurrences,
	extractCodeTags,
	matchMagicTags,
	getTagsForNote,
	extractTags,
	tagDisplayName,
	MAGIC_TAG_MATCH_TYPES,
	type MagicTagRule
} from './tag';

// ─── groupHashtagOccurrences ────────────────────────────────────────────────────

describe('groupHashtagOccurrences', () => {
	it('returns nothing for plain text', () => {
		expect(groupHashtagOccurrences('just plain text')).toEqual([]);
	});

	it('extracts a single hashtag at its position', () => {
		expect(groupHashtagOccurrences('hello #work')).toEqual([{ name: 'work', positions: [6] }]);
	});

	it('extracts multiple distinct hashtags', () => {
		const groups = groupHashtagOccurrences('#todo and #urgent');
		expect(groups.map((g) => g.name)).toEqual(['todo', 'urgent']);
	});

	it('lists every occurrence position in document order', () => {
		expect(groupHashtagOccurrences('#work then #work again')).toEqual([
			{ name: 'work', positions: [0, 11] }
		]);
	});

	it('dedups case-insensitively, keeping first-seen casing', () => {
		expect(groupHashtagOccurrences('#Work #work')).toEqual([{ name: 'Work', positions: [0, 6] }]);
	});

	it('ignores a single-character hashtag', () => {
		expect(groupHashtagOccurrences('#a short')).toEqual([]);
	});

	it('accepts two-character and hierarchical tags', () => {
		expect(groupHashtagOccurrences('#ok #area/project').map((g) => g.name)).toEqual([
			'ok',
			'area/project'
		]);
	});

	it('ignores a `#` inside an inline-HTML tag', () => {
		expect(groupHashtagOccurrences('<span style="color: #fff">x</span>')).toEqual([]);
	});
});

// ─── extractCodeTags ────────────────────────────────────────────────────────────

describe('extractCodeTags', () => {
	it('yields `code` plus the language for a fenced block', () => {
		expect(extractCodeTags('```ts\nconst x = 1\n```')).toEqual(['code', 'ts']);
	});

	it('lowercases the language', () => {
		expect(extractCodeTags('```Python\nprint()\n```')).toEqual(['code', 'python']);
	});

	it('yields nothing for a fence with no language', () => {
		expect(extractCodeTags('```\nplain\n```')).toEqual([]);
	});

	it('yields nothing when there is no fence', () => {
		expect(extractCodeTags('no code here')).toEqual([]);
	});
});

// ─── matchMagicTags ─────────────────────────────────────────────────────────────

const rule = (
	tag: string,
	pattern: string,
	matchType: MagicTagRule['matchType']
): MagicTagRule => ({
	tag,
	pattern,
	matchType
});

describe('matchMagicTags', () => {
	it('returns nothing for an empty rule set', () => {
		expect(matchMagicTags('- [ ] anything', [])).toEqual([]);
	});

	it('matches STARTS_WITH only at the line start', () => {
		const rules = [rule('todo', '- [ ]', MAGIC_TAG_MATCH_TYPES.STARTS_WITH)];
		expect(matchMagicTags('- [ ] buy milk', rules)).toEqual(['todo']);
		expect(matchMagicTags('a line then - [ ] x', rules)).toEqual([]);
	});

	it('matches ENDS_WITH only at the line end', () => {
		const rules = [rule('question', '?', MAGIC_TAG_MATCH_TYPES.ENDS_WITH)];
		expect(matchMagicTags('is this on?', rules)).toEqual(['question']);
		expect(matchMagicTags('? not at end here', rules)).toEqual([]);
	});

	it('matches CONTAINS_WORD only as a whole space-delimited word', () => {
		const rules = [rule('urgent', 'asap', MAGIC_TAG_MATCH_TYPES.CONTAINS_WORD)];
		expect(matchMagicTags('do this asap please', rules)).toEqual(['urgent']);
		expect(matchMagicTags('asapx is not a word', rules)).toEqual([]);
	});

	it('matches CONTAINS anywhere in the text', () => {
		const rules = [rule('idea', 'idea', MAGIC_TAG_MATCH_TYPES.CONTAINS)];
		expect(matchMagicTags('a great idea here', rules)).toEqual(['idea']);
		expect(matchMagicTags('ideally speaking', rules)).toEqual(['idea']);
	});

	it('dedups overlapping rules that map to the same tag', () => {
		const rules = [
			rule('todo', '- [ ]', MAGIC_TAG_MATCH_TYPES.STARTS_WITH),
			rule('todo', 'todo', MAGIC_TAG_MATCH_TYPES.CONTAINS)
		];
		expect(matchMagicTags('- [ ] write the todo', rules)).toEqual(['todo']);
	});
});

// ─── getTagsForNote ─────────────────────────────────────────────────────────────

describe('getTagsForNote', () => {
	it('keeps literal hashtag positions and orders derived tags after them with empty positions', () => {
		const result = getTagsForNote('#work\n```ts\ncode\n```', []);
		expect(result).toEqual([
			{ name: 'work', positions: [0] },
			{ name: 'code', positions: [] },
			{ name: 'ts', positions: [] }
		]);
	});

	it('merges a hashtag and a matching code fence into one navigable entry', () => {
		const result = getTagsForNote('#ts\n```ts\ncode\n```', []);
		const ts = result.filter((t) => t.name === 'ts');
		expect(ts).toEqual([{ name: 'ts', positions: [0] }]);
	});

	it('appends magic tags after hashtags and code tags', () => {
		const rules = [rule('todo', '- [ ]', MAGIC_TAG_MATCH_TYPES.STARTS_WITH)];
		const result = getTagsForNote('#note\n- [ ] task', rules);
		expect(result).toEqual([
			{ name: 'note', positions: [0] },
			{ name: 'todo', positions: [] }
		]);
	});
});

// ─── extractTags ────────────────────────────────────────────────────────────────

describe('extractTags', () => {
	it('returns just the names, in display order', () => {
		expect(extractTags('#work\n```ts\ncode\n```', [])).toEqual(['work', 'code', 'ts']);
	});

	it('returns an empty array for plain text with no rules', () => {
		expect(extractTags('just plain text', [])).toEqual([]);
	});
});

// ─── tagDisplayName ─────────────────────────────────────────────────────────────

describe('tagDisplayName', () => {
	it('returns display_name when set', () => {
		expect(tagDisplayName({ display_name: 'My Project', tag: 'project' })).toBe('My Project');
	});

	it('falls back to the tag when display_name is null', () => {
		expect(tagDisplayName({ display_name: null, tag: 'work' })).toBe('work');
	});

	it('returns an empty display_name as-is, not the fallback', () => {
		expect(tagDisplayName({ display_name: '', tag: 'work' })).toBe('');
	});
});
