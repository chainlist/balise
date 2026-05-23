import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

import { migrate } from './migrations';

function makeMockDB(appliedVersions: number[] = []) {
	const execute = vi.fn().mockResolvedValue(undefined);
	const select = vi.fn().mockResolvedValue(appliedVersions.map((v) => ({ version: v })));
	return { execute, select };
}

function insertCalls(db: ReturnType<typeof makeMockDB>) {
	return db.execute.mock.calls.filter((args) =>
		(args[0] as string).includes('INSERT INTO migrations')
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

	it('runs the 1 migration on a fresh database', async () => {
		const db = makeMockDB([]);
		await migrate(db as never);
		const calls = insertCalls(db);
		expect(calls).toHaveLength(1);
		expect(calls[0][1]).toEqual([1]);
	});

	it('skips migrations that have already been applied', async () => {
		const db = makeMockDB([1]);
		await migrate(db as never);
		expect(insertCalls(db)).toHaveLength(0);
	});

	it('runs nothing when all migrations are applied', async () => {
		const db = makeMockDB([1]);
		await migrate(db as never);
		expect(insertCalls(db)).toHaveLength(0);
	});

	it('records the applied migration version', async () => {
		const db = makeMockDB([]);
		await migrate(db as never);
		const calls = insertCalls(db);
		const versions = calls.map((args) => (args[1] as number[])[0]);
		expect(versions).toEqual([1]);
	});
});
