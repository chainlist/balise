import { describe, it, expect } from 'vitest';
import {
	parseTable,
	serializeTable,
	withColumnInserted,
	withColumnRemoved,
	withColumnAligned,
	withRowInserted,
	withRowRemoved
} from './tablePlugin';

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

const TABLE = ['| a | b |', '| :-- | --: |', '| 1 | 2 |', '| 3 | 4 |'].join('\n');

describe('serializeTable', () => {
	it('round-trips a parsed table, normalizing spacing and alignment tokens', () => {
		const parsed = parseTable(TABLE)!;
		expect(serializeTable(parsed)).toBe(
			['| a | b |', '| :--- | ---: |', '| 1 | 2 |', '| 3 | 4 |'].join('\n')
		);
	});

	it('escapes literal pipes in cell content', () => {
		const parsed = parseTable(['| a |', '| --- |', String.raw`| x \| y |`].join('\n'))!;
		expect(serializeTable(parsed)).toBe(['| a |', '| --- |', String.raw`| x \| y |`].join('\n'));
	});

	it('pads short rows to the header column count', () => {
		const parsed: ReturnType<typeof parseTable> = {
			headers: ['a', 'b'],
			align: [null, null],
			rows: [['1']]
		};
		expect(serializeTable(parsed!)).toBe(['| a | b |', '| --- | --- |', '| 1 |  |'].join('\n'));
	});
});

describe('column mutations', () => {
	it('inserts an empty column at the given index', () => {
		const t = withColumnInserted(parseTable(TABLE)!, 1);
		expect(serializeTable(t)).toBe(
			['| a |  | b |', '| :--- | --- | ---: |', '| 1 |  | 2 |', '| 3 |  | 4 |'].join('\n')
		);
	});

	it('appends a column when inserting past the last index', () => {
		const t = withColumnInserted(parseTable(TABLE)!, 2);
		expect(parseTable(serializeTable(t))!.headers).toEqual(['a', 'b', '']);
	});

	it('removes the column at the given index', () => {
		const t = withColumnRemoved(parseTable(TABLE)!, 0);
		expect(serializeTable(t)).toBe(['| b |', '| ---: |', '| 2 |', '| 4 |'].join('\n'));
	});

	it('refuses to remove the last remaining column', () => {
		const single = parseTable(['| a |', '| --- |', '| 1 |'].join('\n'))!;
		expect(withColumnRemoved(single, 0)).toBe(single);
	});
});

describe('row mutations', () => {
	it('inserts an empty data row at the given index', () => {
		const t = withRowInserted(parseTable(TABLE)!, 0);
		expect(serializeTable(t)).toBe(
			['| a | b |', '| :--- | ---: |', '|  |  |', '| 1 | 2 |', '| 3 | 4 |'].join('\n')
		);
	});

	it('removes the data row at the given index', () => {
		const t = withRowRemoved(parseTable(TABLE)!, 0);
		expect(serializeTable(t)).toBe(['| a | b |', '| :--- | ---: |', '| 3 | 4 |'].join('\n'));
	});
});

describe('column alignment', () => {
	it('sets the alignment of the column at the given index', () => {
		const t = withColumnAligned(parseTable(TABLE)!, 0, 'center');
		expect(serializeTable(t)).toBe(
			['| a | b |', '| :---: | ---: |', '| 1 | 2 |', '| 3 | 4 |'].join('\n')
		);
	});

	it('clears alignment back to default with null', () => {
		const t = withColumnAligned(parseTable(TABLE)!, 1, null);
		expect(serializeTable(t)).toBe(
			['| a | b |', '| :--- | --- |', '| 1 | 2 |', '| 3 | 4 |'].join('\n')
		);
	});
});
