import { fsService } from './fs';
import { getDB } from '$lib/utils/db';
import { tagsService } from '$lib/services/tags.svelte';
import { notesService } from '$lib/services/notes.svelte';
import {
	writeNoteFile,
	scanDeskFiles,
	readDeskFilesContent,
	type DeskFileMeta
} from '$lib/repositories/notes.fs.repo';
import { queryAllNotesMeta, queryNotesWithContentByIds } from '$lib/repositories/notes.repo';
import { msToIsoUtc, parseDbTimestamp } from '$lib/utils/time';

class FsSyncService {
	// Sequential (not Promise.all): canonical tag resolution reads existing rows,
	// so concurrent writes of notes sharing a new tag could resolve inconsistently.
	private async createNotes(
		toCreate: DeskFileMeta[],
		contentMap: Map<string, string>
	): Promise<void> {
		for (const { name, id, pinned, archived, created_at, mtime_ms } of toCreate) {
			await notesService.importNote(id, contentMap.get(name) ?? '', {
				create: true,
				pinned,
				archived,
				createdAt: created_at,
				updatedAt: msToIsoUtc(mtime_ms)
			});
		}
	}

	private async importNotes(
		toImport: DeskFileMeta[],
		contentMap: Map<string, string>
	): Promise<void> {
		// Preserve the file mtime as updated_at: stamping "now" here would
		// collapse every imported note to sync time and break recency ordering.
		// It also damps the write echo (our own file writes land milliseconds
		// after the DB row, so they re-import once; with the mtime preserved,
		// that import converges instead of re-triggering).
		for (const { name, id, pinned, archived, created_at, mtime_ms } of toImport) {
			await notesService.importNote(id, contentMap.get(name) ?? '', {
				create: false,
				pinned,
				archived,
				createdAt: created_at,
				updatedAt: msToIsoUtc(mtime_ms)
			});
		}
	}

	private async writeOrphanedNotes(
		db: Awaited<ReturnType<typeof getDB>>,
		dbNotes: { id: string }[],
		syncedIds: Set<string>
	): Promise<void> {
		const missingIds = dbNotes.filter((n) => !syncedIds.has(n.id)).map((n) => n.id);
		if (missingIds.length === 0) return;
		const notes = await queryNotesWithContentByIds(db, missingIds);
		await Promise.all(notes.map((note) => writeNoteFile(note)));
	}

	async syncDeskFiles(): Promise<void> {
		if (!fsService.currentDesk) return;
		const db = getDB();

		const [deskFiles, dbNotes] = await Promise.all([
			scanDeskFiles(fsService.currentDesk),
			queryAllNotesMeta(db)
		]);

		const dbMap = new Map(dbNotes.map((n) => [n.id, n.updated_at]));
		const syncedIds = new Set<string>();
		const toCreate: DeskFileMeta[] = [];
		const toImport: DeskFileMeta[] = [];

		for (const file of deskFiles) {
			syncedIds.add(file.id);
			const dbUpdatedAt = dbMap.get(file.id);
			if (!dbUpdatedAt) {
				toCreate.push(file);
			} else if (file.mtime_ms > parseDbTimestamp(dbUpdatedAt)) {
				toImport.push(file);
			}
		}

		const needsContent = [...toCreate, ...toImport];
		if (needsContent.length > 0) {
			const contents = await readDeskFilesContent(
				fsService.currentDesk,
				needsContent.map((f) => f.name)
			);
			const contentMap = new Map(contents.map((c) => [c.name, c.content]));
			if (toCreate.length > 0) await this.createNotes(toCreate, contentMap);
			if (toImport.length > 0) await this.importNotes(toImport, contentMap);
			// Refresh tag state once for the whole batch, not per note.
			await tagsService.load();
		}

		await this.writeOrphanedNotes(db, dbNotes, syncedIds);
	}
}

export const fsSyncService = new FsSyncService();
