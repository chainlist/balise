import { getDB } from '$lib/utils/db';
import { insertNote, updateNote } from '$lib/repositories/notes.repo';
import { tagsService } from './tags.svelte';

interface WriteOptions {
	create: boolean;
	pinned?: boolean;
	archived?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

/**
 * The single place that pairs a note content write with tag (re-)derivation.
 * Every path that writes note content (user create/update, journal, file
 * import) goes through here so the `note_tags` invariant cannot be forgotten.
 *
 * Does NOT refresh the tag list: the caller decides when to reload tag state
 * (single user actions reload immediately, bulk import reloads once).
 */
export async function writeNoteContent(
	id: string,
	content: string,
	opts: WriteOptions
): Promise<void> {
	const db = getDB();
	if (opts.create) {
		await insertNote(db, {
			id,
			content,
			createdAt: opts.createdAt,
			updatedAt: opts.updatedAt,
			pinned: opts.pinned,
			archived: opts.archived
		});
	} else {
		await updateNote(db, id, {
			content,
			pinned: opts.pinned,
			archived: opts.archived,
			createdAt: opts.createdAt
		});
	}
	await tagsService.applyNoteTags(id, content);
}
