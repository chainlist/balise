import { invoke } from '@tauri-apps/api/core';
import { fsService } from './fs';
import { getDB } from '$lib/utils/db';
import { tagsService } from '$lib/services/tags.svelte';
import {
	queryAllNotesMeta,
	queryNotesWithContentByIds,
	insertNote,
	updateNote
} from '$lib/repositories/notes.repo';
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

	private async createNotes(
		db: Awaited<ReturnType<typeof getDB>>,
		toCreate: DeskFileMeta[],
		contentMap: Map<string, string>
	): Promise<void> {
		await Promise.all(
			toCreate.map(({ name, id, pinned, archived, created_at, mtime_ms }) =>
				insertNote(db, {
					id,
					content: contentMap.get(name) ?? '',
					pinned,
					archived,
					createdAt: created_at,
					updatedAt: new Date(mtime_ms).toISOString()
				})
			)
		);
		await Promise.all(
			toCreate.map(({ name, id }) => tagsService.syncNoteTags(id, contentMap.get(name) ?? ''))
		);
	}

	private async importNotes(
		db: Awaited<ReturnType<typeof getDB>>,
		toImport: DeskFileMeta[],
		contentMap: Map<string, string>
	): Promise<void> {
		await Promise.all(
			toImport.flatMap(({ name, id, pinned, archived, created_at }) => {
				const content = contentMap.get(name) ?? '';
				return [
					updateNote(db, id, { content, pinned, archived, createdAt: created_at }),
					tagsService.syncNoteTags(id, content)
				];
			})
		);
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
			if (toCreate.length > 0) await this.createNotes(db, toCreate, contentMap);
			if (toImport.length > 0) await this.importNotes(db, toImport, contentMap);
		}

		await this.writeOrphanedNotes(db, dbNotes, syncedIds);
	}
}

export const fsSyncService = new FsSyncService();
