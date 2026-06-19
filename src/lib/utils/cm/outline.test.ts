import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { getHeadingOutline } from './outline';
import { spaceRequiredHeadings } from './headingParser';

// Heading outline is read from the AST, so it respects the editor's parser config:
// ATX only (Setext removed), and a space is required after the `#` marks.
function state(doc: string): EditorState {
	return EditorState.create({
		doc,
		extensions: [
			markdown({
				base: markdownLanguage,
				extensions: [GFM, spaceRequiredHeadings, { remove: ['SetextHeading'] }]
			})
		]
	});
}

describe('getHeadingOutline', () => {
	it('returns nothing for a doc with no headings', () => {
		expect(getHeadingOutline(state('just text\nmore text'))).toEqual([]);
	});

	it('captures level, text, and document offset in order', () => {
		expect(getHeadingOutline(state('# A\n## B'))).toEqual([
			{ level: 1, text: 'A', from: 0 },
			{ level: 2, text: 'B', from: 4 }
		]);
	});

	it('covers all six levels', () => {
		const out = getHeadingOutline(state('# 1\n## 2\n### 3\n#### 4\n##### 5\n###### 6'));
		expect(out.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('strips trailing closing hashes from the text', () => {
		expect(getHeadingOutline(state('## Title ##'))[0]).toMatchObject({ level: 2, text: 'Title' });
	});

	it('ignores a # line with no space after the marks (spaceRequiredHeadings)', () => {
		expect(getHeadingOutline(state('#nospace'))).toEqual([]);
	});

	it('ignores # lines inside a fenced code block', () => {
		expect(getHeadingOutline(state('```\n# not a heading\n```'))).toEqual([]);
	});

	it('ignores Setext underline headings (disabled in this editor)', () => {
		expect(getHeadingOutline(state('Title\n====='))).toEqual([]);
	});
});
