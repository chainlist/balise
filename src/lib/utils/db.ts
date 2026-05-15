import Database from '@tauri-apps/plugin-sql';
import { migrate } from './migrations';

let db = null as Database | null;
let currentDBName = null as string | null;

export async function closeDB(): Promise<void> {
	if (!db) return;

	await db.close();
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

export async function loadDB(dbName: string): Promise<Database> {
	if (db && currentDBName === dbName) {
		return db;
	}

	if (db && currentDBName !== dbName) {
		await closeDB();
	}

	db = await Database.load(`sqlite:${dbName}.db`);
	currentDBName = dbName;
	await migrate(db);
	return db;
}

export function getDB() {
	if (!db) {
		throw new Error('Database not initialized. Call loadDB() first.');
	}

	return db;
}
