import { fsService } from '$lib/services/fs';
import type { Note } from '$lib/models/note';

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
