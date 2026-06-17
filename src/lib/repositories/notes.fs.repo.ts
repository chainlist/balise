import { invoke } from '@tauri-apps/api/core';
import { fsService } from '$lib/services/platform/fs';
import { parseDbTimestamp } from '$lib/utils/time';
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
	const name = `${note.id}.md`;
	await fsService.writeTextFile(name, toFrontmatter(note));
	// Pin the file mtime to the logical updated_at. fs-sync uses mtime to detect
	// edits, so without this our own write (mtime = now) looks newer than the row
	// and gets re-imported, bumping updated_at forward - which makes device-sync
	// re-send unchanged notes every cycle. Best-effort: a failure only loses the
	// optimisation, never the write.
	try {
		await invoke('set_desk_file_mtime', {
			deskName: fsService.currentDesk,
			name,
			mtimeMs: parseDbTimestamp(note.updated_at)
		});
	} catch (e) {
		console.warn('failed to align note file mtime:', e);
	}
}

export async function deleteNoteFile(id: string): Promise<void> {
	if (!fsService.currentDesk) return;
	await fsService.remove(`${id}.md`);
}
