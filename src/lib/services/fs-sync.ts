import {
	BaseDirectory,
	writeTextFile,
	remove,
	readDir,
	readTextFile,
	stat
} from '@tauri-apps/plugin-fs';
import { sanitizeDeskName } from './desk';
import { getDB } from '$lib/utils/db';
import {
	queryAllNotesMeta,
	queryNotesByIds,
	updateNoteContent
} from '$lib/repositories/notes.repo';
import type { Note } from '$lib/repositories/notes.repo';

type NoteMeta = Omit<Note, 'content' | 'title'>;

class FsSyncService {
	#currentDesk = '';

	setCurrentDesk(desk: string): void {
		this.#currentDesk = desk;
	}

	toFrontmatter(note: Note): { meta: string; content: string } {
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
				pinned: Number(raw.pinned),
				archived: Number(raw.archived),
				created_at: raw.created_at,
				updated_at: raw.updated_at
			},
			content: match[2]
		};
	}

	async syncNoteFile(note: Note): Promise<void> {
		if (!this.#currentDesk) return;
		const safeDesk = sanitizeDeskName(this.#currentDesk);
		const { meta, content } = this.toFrontmatter(note);
		await writeTextFile(`Balise/${safeDesk}/${note.id}.md`, meta + content, {
			baseDir: BaseDirectory.Document
		});
	}

	async deleteNoteFile(noteId: string): Promise<void> {
		if (!this.#currentDesk) return;
		const safeDesk = sanitizeDeskName(this.#currentDesk);
		await remove(`Balise/${safeDesk}/${noteId}.md`, { baseDir: BaseDirectory.Document });
	}

	async syncDeskFiles(): Promise<void> {
		if (!this.#currentDesk) return;
		const safeDesk = sanitizeDeskName(this.#currentDesk);
		const dir = `Balise/${safeDesk}`;
		const baseDir = BaseDirectory.Document;
		const db = getDB();

		const [entries, dbNotes] = await Promise.all([
			readDir(dir, { baseDir }),
			queryAllNotesMeta(db)
		]);

		const dbMap = new Map(dbNotes.map((n) => [n.id, n.updated_at]));
		const syncedIds = new Set<string>();
		const filesToImport: { id: string; content: string }[] = [];

		// Detect externally edited files (mtime > DB updated_at) → FS → DB
		await Promise.all(
			entries
				.filter((e) => e.name.endsWith('.md'))
				.map(async (entry) => {
					const filePath = `${dir}/${entry.name}`;
					const [fileContent, fileStat] = await Promise.all([
						readTextFile(filePath, { baseDir }),
						stat(filePath, { baseDir })
					]);

					const parsed = this.fromFrontmatter(fileContent);
					if (!parsed) return;

					const { meta, content } = parsed;
					syncedIds.add(meta.id);

					const dbUpdatedAt = dbMap.get(meta.id);
					if (!dbUpdatedAt || !fileStat.mtime) return;

					if (fileStat.mtime.getTime() > new Date(dbUpdatedAt).getTime()) {
						filesToImport.push({ id: meta.id, content });
					}
				})
		);

		// Import external edits into DB
		if (filesToImport.length > 0) {
			await Promise.all(filesToImport.map(({ id, content }) => updateNoteContent(db, id, content)));
		}

		// Write files for DB notes that have no file yet → DB → FS
		const missingIds = dbNotes.filter((n) => !syncedIds.has(n.id)).map((n) => n.id);
		if (missingIds.length > 0) {
			const notes = await queryNotesByIds(db, missingIds);
			await Promise.all(notes.map((note) => this.syncNoteFile(note)));
		}
	}
}

export const fsSyncService = new FsSyncService();
