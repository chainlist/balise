import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';

let db = null as Database | null;
let currentDBName = null as string | null;

async function closeDB(): Promise<void> {
	if (!db) return;

	try {
		await db.close();
	} catch {
		// Best-effort: the shared pool may already be closed by another window.
	}
	db = null;
	currentDBName = null;
}

export async function closeDBIfMatches(dbName: string): Promise<boolean> {
	if (!db || currentDBName !== dbName) {
		return false;
	}

	await closeDB();
	return true;
}

export async function loadDB(dbName: string, options?: { force?: boolean }): Promise<Database> {
	if (db && currentDBName === dbName && !options?.force) {
		return db;
	}

	// Switching desks: release our handle to the old pool first. On a forced
	// resync of the *same* desk we deliberately skip the close, since the pool
	// is shared across windows — Database.load is idempotent and re-establishes
	// a pool that another window may have closed, without disturbing live ones.
	if (db && currentDBName !== dbName) {
		await closeDB();
	}

	// Migrations live entirely in Rust now: bring the desk DB to the current
	// schema (creating it if missing) before opening it for queries here. Runs
	// on its own connection that closes before Database.load, so there's no
	// overlap with the plugin-sql pool.
	await invoke('migrate_desk_db', { deskName: dbName });
	db = await Database.load(`sqlite:${dbName}.db`);
	currentDBName = dbName;
	return db;
}

export function getDB() {
	if (!db) {
		throw new Error('Database not initialized. Call loadDB() first.');
	}

	return db;
}
