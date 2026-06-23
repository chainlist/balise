import Database from '@tauri-apps/plugin-sql';
import { migrateDeskDb } from './tauri';

// The single shared SQLite connection and the desk-switching/close logic. This
// is the only module that imports `@tauri-apps/plugin-sql`; repositories reach
// the DB through `getDb()` and never see a `Database` handle from elsewhere.

let db = null as Database | null;
let currentDbName = null as string | null;

async function closeConnection(): Promise<void> {
	if (!db) return;

	try {
		await db.close();
	} catch {
		// Best-effort: the shared pool may already be closed by another window.
	}
	db = null;
	currentDbName = null;
}

export async function closeDb(): Promise<void> {
	await closeConnection();
}

export async function closeDbIfMatches(dbName: string): Promise<boolean> {
	if (!db || currentDbName !== dbName) {
		return false;
	}

	await closeConnection();
	return true;
}

export async function loadDb(dbName: string, options?: { force?: boolean }): Promise<Database> {
	if (db && currentDbName === dbName && !options?.force) {
		return db;
	}

	// Switching desks: release our handle to the old pool first. On a forced
	// resync of the *same* desk we deliberately skip the close, since the pool
	// is shared across windows — Database.load is idempotent and re-establishes
	// a pool that another window may have closed, without disturbing live ones.
	if (db && currentDbName !== dbName) {
		await closeConnection();
	}

	// Migrations live entirely in Rust now: bring the desk DB to the current
	// schema (creating it if missing) before opening it for queries here. Runs
	// on its own connection that closes before Database.load, so there's no
	// overlap with the plugin-sql pool.
	await migrateDeskDb(dbName);
	db = await Database.load(`sqlite:${dbName}.db`);
	currentDbName = dbName;
	return db;
}

export function getDb(): Database {
	if (!db) {
		throw new Error('Database not initialized. Call loadDb() first.');
	}

	return db;
}
