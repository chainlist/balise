import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

import { migrate } from './migrations';

function makeMockDB(appliedVersions: number[] = []) {
	const execute = vi.fn().mockResolvedValue(undefined);
	const select = vi.fn().mockResolvedValue(appliedVersions.map((v) => ({ version: v })));
	return { execute, select };
}

function insertCalls(db: ReturnType<typeof makeMockDB>) {
	return db.execute.mock.calls.filter(([sql]: [string]) =>
		sql.includes('INSERT INTO migrations')
	);
}

describe('migrate', () => {
	it('creates the migrations table', async () => {
		const db = makeMockDB();
		await migrate(db as never);
		expect(db.execute).toHaveBeenCalledWith(
			expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
		);
	});

	it('runs all 3 migrations on a fresh database', async () => {
		const db = makeMockDB([]);
		await migrate(db as never);
		const calls = insertCalls(db);
		expect(calls).toHaveLength(3);
		expect(calls[0][1]).toEqual([1]);
		expect(calls[1][1]).toEqual([2]);
		expect(calls[2][1]).toEqual([3]);
	});

	it('skips migrations that have already been applied', async () => {
		const db = makeMockDB([1, 2]);
		await migrate(db as never);
		const calls = insertCalls(db);
		expect(calls).toHaveLength(1);
		expect(calls[0][1]).toEqual([3]);
	});

	it('runs nothing when all migrations are applied', async () => {
		const db = makeMockDB([1, 2, 3]);
		await migrate(db as never);
		expect(insertCalls(db)).toHaveLength(0);
	});

	it('executes the SQL for each unapplied migration', async () => {
		const db = makeMockDB([1]);
		await migrate(db as never);
		// v2 migration should drop old tables
		const sqlCalls = db.execute.mock.calls.map(([sql]: [string]) => sql);
		expect(sqlCalls.some((s: string) => s.includes('DROP TABLE'))).toBe(true);
	});

	it('records each applied migration version in order', async () => {
		const db = makeMockDB([]);
		await migrate(db as never);
		const calls = insertCalls(db);
		const versions = calls.map(([, params]: [string, number[]]) => params[0]);
		expect(versions).toEqual([1, 2, 3]);
	});
});
