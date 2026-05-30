import { invoke } from '@tauri-apps/api/core';
import { fsService } from './fs';
import { getDB } from '$lib/utils/db';
import { tagsService } from '$lib/services/tags.svelte';
import {
	queryAllNotesMeta,
	queryNotesWithContentByIds,
	insertNoteWithMeta,
	updateNoteFromSync
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
			} else if (file.mtime_ms > new Date(dbUpdatedAt.includes('T') ? dbUpdatedAt : dbUpdatedAt.replace(' ', 'T') + 'Z').getTime()) {
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

			if (toCreate.length > 0) {
				await Promise.all(
					toCreate.map(({ name, id, pinned, archived, created_at, mtime_ms }) =>
						insertNoteWithMeta(db, {
							id,
							pinned,
							archived,
							created_at,
							updated_at: new Date(mtime_ms).toISOString(),
							content: contentMap.get(name) ?? ''
						})
					)
				);
				await Promise.all(
					toCreate.map(({ name, id }) =>
						tagsService.syncNoteTags(id, contentMap.get(name) ?? '')
					)
				);
			}

			if (toImport.length > 0) {
				await Promise.all(
					toImport.flatMap(({ name, id, pinned, archived, created_at }) => {
						const content = contentMap.get(name) ?? '';
						return [
							updateNoteFromSync(db, { id, content, pinned, archived, created_at }),
							tagsService.syncNoteTags(id, content)
						];
					})
				);
			}
		}

		const missingIds = dbNotes.filter((n) => !syncedIds.has(n.id)).map((n) => n.id);
		if (missingIds.length > 0) {
			const notes = await queryNotesWithContentByIds(db, missingIds);
			await Promise.all(notes.map((note) => this.syncNoteFile(note)));
		}
	}
}

export const fsSyncService = new FsSyncService();
