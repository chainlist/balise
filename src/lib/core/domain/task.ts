// Tasks domain: parse tasks out of note content and the pure line-rewrite rules
// that move a task between statuses. A task is a single line in a note — either a
// `#todo/#inprogress/#done` hashtag line or a `- [ ]` checklist item — so "tasks"
// is a *view* over Notes with no table of its own. Pure: no I/O, no Svelte, no
// Tauri. The board service (application) does the reads and writes; this file only
// reads strings and returns strings.

import { SYSTEM_TAGS } from './tag';

export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type TaskSource = 'hashtag' | 'checklist';

export interface TaskItem {
	id: string;
	noteId: string;
	noteTitle: string;
	lineIndex: number;
	lineText: string;
	text: string;
	status: TaskStatus;
	source: TaskSource;
}

/** Status hashtag, group 1 is the status word. Non-global so `.exec` is reusable. */
export const HASHTAG_RE = /#(todo|inprogress|done)\b/i;
/** Strips every status hashtag (and trailing space) from the task text. */
const HASHTAG_STRIP_RE = /#(todo|inprogress|done)\b\s*/gi;
/**
 * Checklist item, lenient. Groups: [1] prefix "- [", [2] marker, [3] "] "
 * separator, [4] text. Supports Balise's `~` in-progress marker. Mirrors the
 * shared editor pattern in `utils/markdown-patterns`.
 */
export const CHECKLIST_RE = /^([ \t]*- \[)( |[xX]|~)(\]\s*)(.+)$/;

function hashtagStatus(tag: string): TaskStatus {
	const lower = tag.toLowerCase();
	if (lower === SYSTEM_TAGS.DONE) return SYSTEM_TAGS.DONE;
	if (lower === SYSTEM_TAGS.INPROGRESS) return SYSTEM_TAGS.INPROGRESS;
	return SYSTEM_TAGS.TODO;
}

function checklistStatus(marker: string): TaskStatus {
	if (marker === ' ') return SYSTEM_TAGS.TODO;
	if (marker === '~') return SYSTEM_TAGS.INPROGRESS;
	return SYSTEM_TAGS.DONE;
}

/** Parse every task line in a note's content into a {@link TaskItem}. A line
 *  carries at most one task; a status hashtag wins over a checklist marker on the
 *  same line. */
export function parseTasksFromNote(noteId: string, noteTitle: string, content: string): TaskItem[] {
	const lines = content.split('\n');
	const tasks: TaskItem[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const hashtagMatch = HASHTAG_RE.exec(line);
		if (hashtagMatch) {
			const text = line.replace(HASHTAG_STRIP_RE, '').trim();
			if (text.length === 0) continue;
			tasks.push({
				id: `${noteId}:${i}`,
				noteId,
				noteTitle,
				lineIndex: i,
				lineText: line,
				text,
				status: hashtagStatus(hashtagMatch[1]),
				source: 'hashtag'
			});
			continue;
		}

		const checklistMatch = CHECKLIST_RE.exec(line);
		if (checklistMatch) {
			tasks.push({
				id: `${noteId}:${i}`,
				noteId,
				noteTitle,
				lineIndex: i,
				lineText: line,
				text: checklistMatch[4].trim(),
				status: checklistStatus(checklistMatch[2]),
				source: 'checklist'
			});
		}
	}

	return tasks;
}

/** Rewrite a hashtag task line to a new status (replaces the first status hashtag). */
export function rewriteHashtagLine(line: string, newStatus: TaskStatus): string {
	return line.replace(HASHTAG_RE, `#${newStatus}`);
}

/** Rewrite a checklist task line to a new status. A checklist item has no
 *  in-progress marker, so moving to `inprogress` is a no-op (the line is returned
 *  unchanged). `done` checks the box, anything else clears it. */
export function rewriteChecklistLine(line: string, newStatus: TaskStatus): string {
	if (newStatus === SYSTEM_TAGS.INPROGRESS) return line;
	const marker = newStatus === SYSTEM_TAGS.DONE ? 'x' : ' ';
	return line.replace(
		CHECKLIST_RE,
		(_match, prefix, _marker, sep, text) => `${prefix}${marker}${sep}${text}`
	);
}

/** Board column color per status. */
export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
	todo: 'oklch(0.65 0.18 240)',
	inprogress: 'oklch(0.75 0.18 85)',
	done: 'oklch(0.65 0.18 145)'
};
