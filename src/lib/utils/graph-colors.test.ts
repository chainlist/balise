import { describe, it, expect } from 'vitest';
import { assignGraphColors, DEFAULT_TAG_COLOR } from './graph-colors';
import type { Tag } from '$lib/models/tag';

function makeTag(tag: string, color: string | null = null): Tag {
	return { tag, color, display_name: null, pinned: false, count: 1 };
}

describe('assignGraphColors', () => {
	it('returns a record keyed by lowercase tag name', () => {
		const tags = [makeTag('Work')];
		const colors = assignGraphColors(tags, false);
		expect(colors['work']).toBeDefined();
		expect(colors['Work']).toBeUndefined();
	});

	it('uses the palette color for tags with no custom color', () => {
		const tags = [makeTag('a'), makeTag('b')];
		const colors = assignGraphColors(tags, false);
		expect(colors['a']).toMatch(/^#/);
		expect(colors['b']).toMatch(/^#/);
	});

	it('uses a different palette for dark mode', () => {
		const tags = [makeTag('x')];
		const light = assignGraphColors(tags, false);
		const dark = assignGraphColors(tags, true);
		expect(light['x']).not.toBe(dark['x']);
	});

	it('uses the tag custom color when set and not the default', () => {
		const tags = [makeTag('special', '#FF0000')];
		const colors = assignGraphColors(tags, false);
		expect(colors['special']).toBe('#FF0000');
	});

	it('ignores custom color equal to DEFAULT_TAG_COLOR and uses palette instead', () => {
		// PALETTE_LIGHT[0] === DEFAULT_TAG_COLOR, so we can't assert "not equal to DEFAULT_TAG_COLOR".
		// Instead verify the branch behaves identically to having no custom color.
		const withDefault = assignGraphColors([makeTag('plain', DEFAULT_TAG_COLOR)], false);
		const withNull = assignGraphColors([makeTag('plain', null)], false);
		expect(withDefault['plain']).toBe(withNull['plain']);
	});

	it('cycles palette colors when there are more tags than palette entries', () => {
		const tags = Array.from({ length: 20 }, (_, i) => makeTag(`t${i}`));
		const colors = assignGraphColors(tags, false);
		expect(Object.keys(colors)).toHaveLength(20);
		for (const key of Object.keys(colors)) {
			expect(colors[key]).toMatch(/^#/);
		}
	});

	it('second tag in rank gets a different palette color than the first', () => {
		const tags = [makeTag('first'), makeTag('second')];
		const colors = assignGraphColors(tags, false);
		expect(colors['first']).not.toBe(colors['second']);
	});
});
