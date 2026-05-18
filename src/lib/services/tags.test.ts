import { describe, it, expect, vi } from 'vitest';

// Replace SvelteSet with the native Set so extractTags works in the Node environment
vi.mock('svelte/reactivity', () => ({ SvelteSet: Set }));
vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));
vi.mock('$lib/utils/db', () => ({ getDB: vi.fn() }));

import { extractTags, tagDisplayName } from './tags.svelte';

describe('extractTags', () => {
	it('returns an empty array for plain text', () => {
		expect(extractTags('just plain text')).toHaveLength(0);
	});

	it('extracts a single hashtag', () => {
		expect(extractTags('Hello #work today')).toContain('work');
	});

	it('extracts multiple hashtags', () => {
		const tags = extractTags('#todo #urgent check this');
		expect(tags).toContain('todo');
		expect(tags).toContain('urgent');
	});

	it('strips the leading # from the tag value', () => {
		const tags = extractTags('#project');
		expect(tags).not.toContain('#project');
		expect(tags).toContain('project');
	});

	it('ignores single-character hashtags', () => {
		expect(extractTags('#a short')).not.toContain('a');
	});

	it('accepts two-character tags', () => {
		expect(extractTags('#ok')).toContain('ok');
	});

	it('deduplicates repeated tags', () => {
		const tags = extractTags('#work and #work again');
		expect(tags.filter((t) => t === 'work')).toHaveLength(1);
	});

	it('handles slash-separated hierarchical tags', () => {
		expect(extractTags('see #area/project')).toContain('area/project');
	});

	it('infers #code from a fenced code block with a language', () => {
		expect(extractTags('```typescript\nconst x = 1\n```')).toContain('code');
	});

	it('infers the language name from a fenced code block', () => {
		expect(extractTags('```typescript\nconst x = 1\n```')).toContain('typescript');
	});

	it('lowercases the inferred language tag', () => {
		expect(extractTags('```Python\nprint("hi")\n```')).toContain('python');
	});

	it('does not infer #code from a fence with no language', () => {
		expect(extractTags('```\nsome code\n```')).not.toContain('code');
	});

	it('combines hashtag and code-block tags without duplicates', () => {
		const tags = extractTags('#typescript note\n```typescript\ncode\n```');
		expect(tags.filter((t) => t === 'typescript')).toHaveLength(1);
	});
});

describe('tagDisplayName', () => {
	it('returns display_name when it is set', () => {
		expect(tagDisplayName({ display_name: 'My Project', tag: 'project' })).toBe('My Project');
	});

	it('falls back to the tag value when display_name is null', () => {
		expect(tagDisplayName({ display_name: null, tag: 'work' })).toBe('work');
	});

	it('returns an empty display_name as-is (not the tag fallback)', () => {
		expect(tagDisplayName({ display_name: '', tag: 'work' })).toBe('');
	});
});
