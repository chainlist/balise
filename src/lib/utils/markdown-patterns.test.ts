import { describe, it, expect } from 'vitest';
import {
	HIGHLIGHT_SOURCE,
	UNDERLINE_SOURCE,
	BARE_URL_SOURCE,
	FENCE_LANG_SOURCE,
	IMAGE_SOURCE,
	HEADING_PREFIX_RE,
	CHECKLIST_RE,
	CHECKBOX_RE
} from './markdown-patterns';

// These source strings/regexes are the single source of truth for what the editor
// and preview treat as highlight / underline / link / image / checkbox syntax.
// They underpin the widget plugins (whose recognition is otherwise hard to unit-test).

describe('HIGHLIGHT_SOURCE (=text=)', () => {
	const re = () => new RegExp(HIGHLIGHT_SOURCE, 'g');
	it('matches a single-delimiter highlight and captures the inner text', () => {
		const m = re().exec('a =hi= b');
		expect(m?.[0]).toBe('=hi=');
		expect(m?.[1]).toBe('hi');
	});
	it('does not span newlines', () => {
		expect(re().test('=a\nb=')).toBe(false);
	});
	it('does not match an empty pair', () => {
		expect(re().test('==')).toBe(false);
	});
	it('ignores the = in HTML attributes so color spans do not bracket a false highlight', () => {
		const doc = '<span style="color: #abc">a</span> b <span style="color: #def">c</span>';
		expect(re().test(doc)).toBe(false);
	});
	it('still matches a real highlight next to a color span', () => {
		const m = re().exec('<span style="color: #abc">x</span> =hi= y');
		expect(m?.[0]).toBe('=hi=');
		expect(m?.[1]).toBe('hi');
	});
});

describe('UNDERLINE_SOURCE (<u>/<ins>)', () => {
	const re = () => new RegExp(UNDERLINE_SOURCE, 'g');
	it('matches <u>…</u> and captures tag + inner text', () => {
		const m = re().exec('x <u>hi</u> y');
		expect(m?.[0]).toBe('<u>hi</u>');
		expect(m?.[1]).toBe('u');
		expect(m?.[2]).toBe('hi');
	});
	it('matches <ins>…</ins>', () => {
		expect(re().exec('<ins>z</ins>')?.[1]).toBe('ins');
	});
	it('requires the closing tag to match the opener (backreference)', () => {
		expect(re().test('<u>hi</ins>')).toBe(false);
	});
});

describe('BARE_URL_SOURCE', () => {
	const re = () => new RegExp(BARE_URL_SOURCE, 'g');
	it('matches an http(s) URL', () => {
		expect(re().exec('see https://example.com/x now')?.[0]).toBe('https://example.com/x');
	});
	it('stops before trailing brackets and quotes', () => {
		expect(re().exec('(https://a.com)')?.[0]).toBe('https://a.com');
	});
	it('does not match a non-http scheme', () => {
		expect(re().test('ftp://example.com')).toBe(false);
	});
});

describe('FENCE_LANG_SOURCE', () => {
	const re = () => new RegExp(FENCE_LANG_SOURCE, 'gm');
	it('captures the language of a fence opener', () => {
		expect(re().exec('```ts')?.[1]).toBe('ts');
	});
	it('requires the language to start with a letter', () => {
		expect(re().test('```1bad')).toBe(false);
	});
});

describe('IMAGE_SOURCE', () => {
	const re = () => new RegExp(IMAGE_SOURCE, 'g');
	it('matches ![alt](path)', () => {
		expect(re().exec('a ![alt](pic.png) b')?.[0]).toBe('![alt](pic.png)');
	});
	it('matches an empty alt', () => {
		expect(re().exec('![](x.png)')?.[0]).toBe('![](x.png)');
	});
});

describe('HEADING_PREFIX_RE', () => {
	it('matches leading ATX markers with a trailing space', () => {
		expect(HEADING_PREFIX_RE.test('### Title')).toBe(true);
	});
	it('does not match without a trailing space', () => {
		expect(HEADING_PREFIX_RE.test('###Title')).toBe(false);
	});
});

describe('CHECKBOX_RE', () => {
	it('matches an unchecked box and captures marker + text', () => {
		const m = CHECKBOX_RE.exec('- [ ] task');
		expect(m?.[1]).toBe(' ');
		expect(m?.[2]).toBe('task');
	});
	it('matches a checked box (x or X) with leading indentation', () => {
		expect(CHECKBOX_RE.exec('  - [x] done')?.[1]).toBe('x');
		expect(CHECKBOX_RE.exec('- [X] done')?.[1]).toBe('X');
	});
	it('does not treat the ~ in-progress marker as a checkbox', () => {
		expect(CHECKBOX_RE.test('- [~] wip')).toBe(false);
	});
});

describe('CHECKLIST_RE (lenient, includes ~ in-progress)', () => {
	it('captures the four parts of a checklist item', () => {
		const m = CHECKLIST_RE.exec('- [x] done');
		expect(m?.[2]).toBe('x');
		expect(m?.[4]).toBe('done');
	});
	it('accepts the ~ in-progress marker', () => {
		expect(CHECKLIST_RE.exec('- [~] wip')?.[2]).toBe('~');
	});
});
