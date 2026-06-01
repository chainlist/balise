import { getDB } from '$lib/utils/db';
import { queryAllNotesWithContent } from '$lib/repositories/notes.repo';
import { notesService } from './notes.svelte';
import { extractTitle } from '$lib/utils/note-utils';
import { parseTasksFromNote, type TaskItem, type TaskStatus } from '$lib/utils/task-parser';

export type { TaskItem, TaskStatus, TaskSource } from '$lib/utils/task-parser';

const HASHTAG_RE = /#(todo|inprogress|done)\b/i;
const CHECKLIST_RE = /^([ \t]*- \[)( |[xX]|~)(\].*)$/;

function rewriteHashtagLine(line: string, newStatus: TaskStatus): string {
	return line.replace(HASHTAG_RE, `#${newStatus}`);
}

function rewriteChecklistLine(line: string, newStatus: TaskStatus): string {
	const marker = newStatus === 'done' ? 'x' : ' ';
	return line.replace(CHECKLIST_RE, (_, prefix, _old, suffix) => `${prefix}${marker}${suffix}`);
}

class TasksService {
	tasks = $state<TaskItem[]>([]);

	async load(): Promise<void> {
		const rows = await queryAllNotesWithContent(getDB());
		const all: TaskItem[] = [];
		for (const row of rows) {
			all.push(...parseTasksFromNote(row.id, extractTitle(row.content), row.content));
		}
		this.tasks = all;
	}

	async moveTask(task: TaskItem, newStatus: TaskStatus): Promise<void> {
		if (task.status === newStatus) return;
		if (task.source === 'checklist' && newStatus === 'inprogress') return;

		const content = await notesService.loadContent(task.noteId);
		const lines = content.split('\n');
		if (lines[task.lineIndex] !== task.lineText) {
			await this.load();
			return;
		}

		const newLine =
			task.source === 'hashtag'
				? rewriteHashtagLine(task.lineText, newStatus)
				: rewriteChecklistLine(task.lineText, newStatus);

		if (newLine === task.lineText) return;

		lines[task.lineIndex] = newLine;
		await notesService.update(task.noteId, lines.join('\n'));
		await this.load();
	}
}

export const tasksService = new TasksService();
