import { invoke } from '@tauri-apps/api/core';
import { fsService } from './fs';
import { getDB } from '$lib/utils/db';
import { tagsService } from '$lib/services/tags.svelte';
import { writeNoteContent } from '$lib/services/note-write';
import { queryAllNotesMeta, queryNotesWithContentByIds } from '$lib/repositories/notes.repo';
import type { Note } from '$lib/models/note';

type DeskFileMeta = {
	name: string;
	id: string;
	pinned: boolean;
	archived: boolean;
	created_at: string;
	updated_at: string;
	mtime_ms: number;
};

type FileContent = { name: string; content: string };

// SQLite stores timestamps as "YYYY-MM-DD HH:MM:SS" (without T/Z) or ISO 8601.
// Normalise to a proper ISO string before parsing.
function parseDbTimestamp(ts: string): number {
	return new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z').getTime();
}

class FsSyncService {
	toFrontmatter(note: Note & { content: string }): { meta: string; content: string } {
		const meta = [
			'---',
			`id: ${note.id}`,
			`pinned: ${note.pinned}`,
			`archived: ${note.archived}`,
			`created_at: ${note.created_at}`,
			`updated_at: ${note.updated_at}`,
			'---',
			''
		].join('\n');
		return { meta, content: note.content };
	}

	async syncNoteFile(note: Note & { content: string }): Promise<void> {
		if (!fsService.currentDesk) return;
		const { meta, content } = this.toFrontmatter(note);
		await fsService.writeTextFile(`${note.id}.md`, meta + content);
	}

	async deleteNoteFile(noteId: string): Promise<void> {
		if (!fsService.currentDesk) return;
		await fsService.remove(`${noteId}.md`);
	}

	// Sequential (not Promise.all): canonical tag resolution reads existing rows,
	// so concurrent writes of notes sharing a new tag could resolve inconsistently.
	private async createNotes(
		toCreate: DeskFileMeta[],
		contentMap: Map<string, string>
	): Promise<void> {
		for (const { name, id, pinned, archived, created_at, mtime_ms } of toCreate) {
			await writeNoteContent(id, contentMap.get(name) ?? '', {
				create: true,
				pinned,
				archived,
				createdAt: created_at,
				updatedAt: new Date(mtime_ms).toISOString()
			});
		}
	}

	private async importNotes(
		toImport: DeskFileMeta[],
		contentMap: Map<string, string>
	): Promise<void> {
		for (const { name, id, pinned, archived, created_at } of toImport) {
			await writeNoteContent(id, contentMap.get(name) ?? '', {
				create: false,
				pinned,
				archived,
				createdAt: created_at
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
		await Promise.all(notes.map((note) => this.syncNoteFile(note)));
	}

	async syncDeskFiles(): Promise<void> {
		if (!fsService.currentDesk) return;
		const db = getDB();

		const [deskFiles, dbNotes] = await Promise.all([
			invoke<DeskFileMeta[]>('scan_desk_files', { deskName: fsService.currentDesk }),
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
			const contents = await invoke<FileContent[]>('read_desk_files_content', {
				deskName: fsService.currentDesk,
				names: needsContent.map((f) => f.name)
			});
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
