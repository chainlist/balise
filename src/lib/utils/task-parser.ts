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

export const HASHTAG_RE = /#(todo|inprogress|done)\b/i;
const HASHTAG_STRIP_RE = /#(todo|inprogress|done)\b\s*/gi;
// Groups: [1] prefix "- [", [2] marker, [3] "] " separator, [4] text
export const CHECKLIST_RE = /^([ \t]*- \[)( |[xX]|~)(\]\s*)(.+)$/;

function hashtagStatus(tag: string): TaskStatus {
	const lower = tag.toLowerCase();
	if (lower === 'done') return 'done';
	if (lower === 'inprogress') return 'inprogress';
	return 'todo';
}

function checklistStatus(marker: string): TaskStatus {
	if (marker === ' ') return 'todo';
	if (marker === '~') return 'inprogress';
	return 'done';
}

export function parseTasksFromNote(
	noteId: string,
	noteTitle: string,
	content: string
): TaskItem[] {
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
