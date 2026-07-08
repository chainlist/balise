import { describe, it, expect } from 'vitest';
import {
	parseTable,
	serializeTable,
	withColumnInserted,
	withColumnRemoved,
	withHeaderColToggled,
	withHeaderRowToggled,
	withRowInserted,
	withRowRemoved
} from './table-model';

describe('parseTable', () => {
	it('returns null when there is no delimiter row', () => {
		expect(parseTable('| a | b |')).toBeNull();
	});

	it('parses headers, rows, and strips the outer pipes', () => {
		const t = parseTable(['| a | b |', '| --- | --- |', '| 1 | 2 |', '| 3 | 4 |'].join('\n'));
		expect(t).toEqual({
			headerRow: true,
			headerCol: false,
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

	it('detects an all-empty header row as headerRow off', () => {
		const t = parseTable(['|  |  |', '| --- | --- |', '| 1 | 2 |'].join('\n'));
		expect(t?.headerRow).toBe(false);
		expect(t?.rows).toEqual([['1', '2']]);
	});

	it('detects a fully bold first column as a header column and strips the markers', () => {
		const t = parseTable(
			['| **a** | b |', '| --- | --- |', '| **x** | 1 |', '| **y** | 2 |'].join('\n')
		);
		expect(t?.headerCol).toBe(true);
		expect(t?.headers).toEqual(['a', 'b']);
		expect(t?.rows).toEqual([
			['x', '1'],
			['y', '2']
		]);
	});

	it('requires the header first cell to be bold too when there is a header row', () => {
		const t = parseTable(
			['| a | b |', '| --- | --- |', '| **x** | 1 |', '| **y** | 2 |'].join('\n')
		);
		expect(t?.headerCol).toBe(false);
	});

	it('detects a header column from data cells alone when there is no header row', () => {
		const t = parseTable(['|  |  |', '| --- | --- |', '| **x** | 1 |'].join('\n'));
		expect(t?.headerCol).toBe(true);
		expect(t?.rows).toEqual([['x', '1']]);
	});

	it('ignores empty first-column cells for header-column detection', () => {
		const t = parseTable(
			['| **a** | b |', '| --- | --- |', '| **x** | 1 |', '|  | 2 |'].join('\n')
		);
		expect(t?.headerCol).toBe(true);
		expect(t?.rows).toEqual([
			['x', '1'],
			['', '2']
		]);
	});

	it('does not treat partially bold first-column cells as a header column', () => {
		const t = parseTable(['| a | b |', '| --- | --- |', '| **x** and **y** | 1 |'].join('\n'));
		expect(t?.headerCol).toBe(false);
		expect(t?.rows).toEqual([['**x** and **y**', '1']]);
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
			headerRow: true,
			headerCol: false,
			headers: ['a', 'b'],
			align: [null, null],
			rows: [['1']]
		};
		expect(serializeTable(parsed!)).toBe(['| a | b |', '| --- | --- |', '| 1 |  |'].join('\n'));
	});

	it('bold-wraps first-column cells when headerCol is on, round-tripping through parse', () => {
		const t = parseTable(
			['| **a** | b |', '| --- | --- |', '| **x** | 1 |', '| **y** | 2 |'].join('\n')
		)!;
		const md = serializeTable(t);
		expect(md).toBe(
			['| **a** | b |', '| --- | --- |', '| **x** | 1 |', '| **y** | 2 |'].join('\n')
		);
		expect(parseTable(md)).toEqual(t);
	});
});

describe('header toggles', () => {
	it('demotes the header into the first data row when toggled off', () => {
		const t = withHeaderRowToggled(parseTable(TABLE)!);
		expect(serializeTable(t)).toBe(
			['|  |  |', '| :--- | ---: |', '| a | b |', '| 1 | 2 |', '| 3 | 4 |'].join('\n')
		);
		expect(parseTable(serializeTable(t))?.headerRow).toBe(false);
	});

	it('promotes the first data row into the header when toggled on', () => {
		const off = parseTable(['|  |  |', '| --- | --- |', '| a | b |', '| 1 | 2 |'].join('\n'))!;
		const t = withHeaderRowToggled(off);
		expect(t.headerRow).toBe(true);
		expect(t.headers).toEqual(['a', 'b']);
		expect(t.rows).toEqual([['1', '2']]);
	});

	it('keeps a headerless table without data rows unchanged when toggled on', () => {
		const off = parseTable(['|  |  |', '| --- | --- |'].join('\n'))!;
		expect(withHeaderRowToggled(off)).toBe(off);
	});

	it('toggles the header column flag and persists it through serialize/parse', () => {
		const t = withHeaderColToggled(parseTable(TABLE)!);
		expect(t.headerCol).toBe(true);
		const md = serializeTable(t);
		expect(md).toBe(
			['| **a** | b |', '| :--- | ---: |', '| **1** | 2 |', '| **3** | 4 |'].join('\n')
		);
		expect(parseTable(md)?.headerCol).toBe(true);
		expect(withHeaderColToggled(parseTable(md)!).headerCol).toBe(false);
	});

	it('persists the header column through the header cell when the data cells are empty', () => {
		const empty = parseTable(['| a | b |', '| --- | --- |', '|  |  |'].join('\n'))!;
		const md = serializeTable(withHeaderColToggled(empty));
		expect(md).toBe(['| **a** | b |', '| --- | --- |', '|  |  |'].join('\n'));
		expect(parseTable(md)?.headerCol).toBe(true);
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
