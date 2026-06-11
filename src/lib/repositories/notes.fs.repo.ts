import { invoke } from '@tauri-apps/api/core';
import { fsService } from '$lib/services/fs';
import type { Note } from '$lib/models/note';

export type DeskFileMeta = {
	name: string;
	id: string;
	pinned: boolean;
	archived: boolean;
	created_at: string;
	updated_at: string;
	mtime_ms: number;
};

export type DeskFileContent = { name: string; content: string };

export async function scanDeskFiles(deskName: string): Promise<DeskFileMeta[]> {
	return invoke<DeskFileMeta[]>('scan_desk_files', { deskName });
}

export async function readDeskFilesContent(
	deskName: string,
	names: string[]
): Promise<DeskFileContent[]> {
	return invoke<DeskFileContent[]>('read_desk_files_content', { deskName, names });
}

function toFrontmatter(note: Note & { content: string }): string {
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
	return meta + note.content;
}

export async function writeNoteFile(note: Note & { content: string }): Promise<void> {
	if (!fsService.currentDesk) return;
	await fsService.writeTextFile(`${note.id}.md`, toFrontmatter(note));
}

export async function deleteNoteFile(id: string): Promise<void> {
	if (!fsService.currentDesk) return;
	await fsService.remove(`${id}.md`);
}
