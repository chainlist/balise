import { noteRepo } from '$lib/core/repositories/note.repo';
import { notesService } from '$lib/core/services/notes.svelte';
import {
	parseTasksFromNote,
	rewriteHashtagLine,
	rewriteChecklistLine,
	type TaskItem,
	type TaskStatus
} from '$lib/core/domain/task';

export type { TaskItem, TaskStatus } from '$lib/core/domain/task';

// Application layer: the task board is a thin view over Notes (lines tagged
// `#todo/#inprogress/#done` or checklist items), so this service owns the board
// state but no table. Reads come from `note.repo`, the parse/rewrite rules from
// `domain/task`, and the one write delegates to `notesService.update` so note
// persistence (tag re-derivation, `.md` mirror, sync) keeps a single owner — the
// reason Tasks depends on Notes. Methods stay thin sequencers: no SQL, no rules.
class TasksService {
	tasks = $state<TaskItem[]>([]);

	/** Load active (todo, inprogress) and recent done task notes, parse each into
	 *  its task lines, dedupe by note id, and flatten into the board. */
	async load(): Promise<void> {
		const [activeNotes, doneNotes] = await Promise.all([
			noteRepo.findActiveTaskNotes(),
			noteRepo.findRecentDoneNotes()
		]);

		const noteMap = new Map([...activeNotes, ...doneNotes].map((n) => [n.id, n]));
		const all: TaskItem[] = [];
		for (const note of noteMap.values()) {
			all.push(...parseTasksFromNote(note.id, note.title, note.content));
		}
		this.tasks = all;
	}

	/** Move a task to a new status by rewriting its source line, then persisting
	 *  through `notesService.update`. Reloads if the line moved under us; no-ops
	 *  when the rewrite changes nothing (same status, or checklist to inprogress). */
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

		const found = this.tasks.find((t) => t.id === task.id);
		if (found) {
			found.status = newStatus;
			found.lineText = newLine;
		}
	}
}

export const tasksService = new TasksService();
