import { fsService } from './fs';
import { getDB } from '$lib/utils/db';
import { tagsService } from '$lib/services/tags.svelte';
import {
	queryAllNotesMeta,
	queryNotesWithContentByIds,
	updateNoteContent,
	insertNoteWithMeta
} from '$lib/repositories/notes.repo';
import type { Note } from '$lib/repositories/notes.repo';

type NoteMeta = Omit<Note, 'content' | 'title'>;

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

	fromFrontmatter(fileContent: string): { meta: NoteMeta; content: string } | null {
		const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return null;

		const raw: Record<string, string> = {};
		for (const line of match[1].split('\n')) {
			const idx = line.indexOf(':');
			if (idx === -1) continue;
			raw[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
		}

		if (!raw.id) return null;

		return {
			meta: {
				id: raw.id,
				pinned: raw.pinned === '1' || raw.pinned === 'true',
				archived: raw.archived === '1' || raw.archived === 'true',
				created_at: raw.created_at,
				updated_at: raw.updated_at
			},
			content: match[2]
		};
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

		const [entries, dbNotes] = await Promise.all([
			fsService.readDir(),
			queryAllNotesMeta(db)
		]);

		const dbMap = new Map(dbNotes.map((n) => [n.id, n.updated_at]));
		const syncedIds = new Set<string>();
		const filesToImport: { id: string; content: string }[] = [];
		const filesToCreate: { meta: NoteMeta; content: string }[] = [];

		await Promise.all(
			entries
				.filter((e) => e.name.endsWith('.md'))
				.map(async (entry) => {
					const [fileContent, fileStat] = await Promise.all([
						fsService.readTextFile(entry.name),
						fsService.stat(entry.name)
					]);

					const parsed = this.fromFrontmatter(fileContent);
					if (!parsed) return;

					const { meta, content } = parsed;
					syncedIds.add(meta.id);

					const dbUpdatedAt = dbMap.get(meta.id);
					if (!dbUpdatedAt) {
						filesToCreate.push({ meta, content });
						return;
					}

					if (!fileStat.mtime) return;

					if (fileStat.mtime.getTime() > new Date(dbUpdatedAt).getTime()) {
						filesToImport.push({ id: meta.id, content });
					}
				})
		);

		if (filesToCreate.length > 0) {
			await Promise.all(filesToCreate.map(({ meta, content }) => insertNoteWithMeta(db, { ...meta, content })));
			await Promise.all(filesToCreate.map(({ meta, content }) => tagsService.syncNoteTags(meta.id, content)));
		}

		if (filesToImport.length > 0) {
			await Promise.all(
				filesToImport.flatMap(({ id, content }) => [
					updateNoteContent(db, id, content),
					tagsService.syncNoteTags(id, content)
				])
			);
		}

		const missingIds = dbNotes.filter((n) => !syncedIds.has(n.id)).map((n) => n.id);
		if (missingIds.length > 0) {
			const notes = await queryNotesWithContentByIds(db, missingIds);
			await Promise.all(notes.map((note) => this.syncNoteFile(note)));
		}
	}
}

export const fsSyncService = new FsSyncService();
