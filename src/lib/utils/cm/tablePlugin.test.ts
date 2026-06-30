import { describe, it, expect } from 'vitest';
import { parseTable } from './tablePlugin';

describe('parseTable', () => {
	it('returns null when there is no delimiter row', () => {
		expect(parseTable('| a | b |')).toBeNull();
	});

	it('parses headers, rows, and strips the outer pipes', () => {
		const t = parseTable(['| a | b |', '| --- | --- |', '| 1 | 2 |', '| 3 | 4 |'].join('\n'));
		expect(t).toEqual({
			headers: ['a', 'b'],
			align: [null, null],
			rows: [
				['1', '2'],
				['3', '4']
			]
		});
	});

	it('reads column alignment from the delimiter row', () => {
		const t = parseTable(['| a | b | c |', '| :-- | :-: | --: |', '| 1 | 2 | 3 |'].join('\n'));
		expect(t?.align).toEqual(['left', 'center', 'right']);
	});

	it('handles rows without outer pipes', () => {
		const t = parseTable(['a | b', '--- | ---', '1 | 2'].join('\n'));
		expect(t?.headers).toEqual(['a', 'b']);
		expect(t?.rows).toEqual([['1', '2']]);
	});

	it('treats an escaped pipe as literal cell content', () => {
		const t = parseTable(['| a | b |', '| --- | --- |', String.raw`| x \| y | z |`].join('\n'));
		expect(t?.rows).toEqual([['x | y', 'z']]);
	});

	it('keeps a legitimately empty leading cell', () => {
		const t = parseTable(['| a | b |', '| --- | --- |', '|  | 2 |'].join('\n'));
		expect(t?.rows).toEqual([['', '2']]);
	});
});
