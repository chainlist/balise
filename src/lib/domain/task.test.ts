import { describe, it, expect } from 'vitest';
import { parseTasksFromNote, rewriteHashtagLine, rewriteChecklistLine } from './task';

const NOTE_ID = 'note-1';
const NOTE_TITLE = 'Test Note';

describe('parseTasksFromNote', () => {
	it('returns empty array for empty content', () => {
		expect(parseTasksFromNote(NOTE_ID, NOTE_TITLE, '')).toEqual([]);
	});

	it('returns empty array when no tasks are present', () => {
		expect(parseTasksFromNote(NOTE_ID, NOTE_TITLE, 'just some text\nno tasks here')).toEqual([]);
	});

	describe('hashtag tasks', () => {
		it('parses a #todo hashtag line', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, 'Buy groceries #todo');
			expect(task.status).toBe('todo');
			expect(task.text).toBe('Buy groceries');
			expect(task.source).toBe('hashtag');
		});

		it('parses a #inprogress hashtag line', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, 'Working on feature #inprogress');
			expect(task.status).toBe('inprogress');
		});

		it('parses a #done hashtag line', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, 'Finished task #done');
			expect(task.status).toBe('done');
		});

		it('is case-insensitive for hashtag status', () => {
			const [todo] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, 'Task #TODO');
			expect(todo.status).toBe('todo');
			const [done] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, 'Task #DONE');
			expect(done.status).toBe('done');
		});

		it('skips lines where the task text is empty after stripping the hashtag', () => {
			expect(parseTasksFromNote(NOTE_ID, NOTE_TITLE, '#todo')).toEqual([]);
		});

		it('strips all status hashtags from the task text', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, 'Clean up #todo #done');
			expect(task.text).toBe('Clean up');
		});
	});

	describe('checklist tasks', () => {
		it('parses an unchecked checklist item as todo', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, '- [ ] Buy milk');
			expect(task.status).toBe('todo');
			expect(task.text).toBe('Buy milk');
			expect(task.source).toBe('checklist');
		});

		it('parses a checked checklist item as done', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, '- [x] Done task');
			expect(task.status).toBe('done');
		});

		it('parses an uppercase X checked item as done', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, '- [X] Done task');
			expect(task.status).toBe('done');
		});

		it('parses a tilde checklist item as inprogress', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, '- [~] In progress');
			expect(task.status).toBe('inprogress');
		});
	});

	describe('task metadata', () => {
		it('assigns correct noteId and noteTitle', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, 'My task #todo');
			expect(task.noteId).toBe(NOTE_ID);
			expect(task.noteTitle).toBe(NOTE_TITLE);
		});

		it('assigns id as noteId:lineIndex', () => {
			const content = 'First line\nMy task #todo';
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, content);
			expect(task.id).toBe(`${NOTE_ID}:1`);
			expect(task.lineIndex).toBe(1);
		});

		it('stores the original line text', () => {
			const line = 'My task #todo';
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, line);
			expect(task.lineText).toBe(line);
		});
	});

	describe('multiple tasks', () => {
		it('parses multiple tasks from different lines', () => {
			const content = ['Task A #todo', 'Task B #done', '- [ ] Task C'].join('\n');
			const tasks = parseTasksFromNote(NOTE_ID, NOTE_TITLE, content);
			expect(tasks).toHaveLength(3);
			expect(tasks[0].text).toBe('Task A');
			expect(tasks[1].text).toBe('Task B');
			expect(tasks[2].text).toBe('Task C');
		});

		it('prioritizes hashtag over checklist when both appear on the same line', () => {
			const [task] = parseTasksFromNote(NOTE_ID, NOTE_TITLE, '- [ ] Task #done');
			expect(task.source).toBe('hashtag');
			expect(task.status).toBe('done');
		});
	});
});

describe('rewriteHashtagLine', () => {
	it('rewrites todo to inprogress', () => {
		expect(rewriteHashtagLine('Buy groceries #todo', 'inprogress')).toBe(
			'Buy groceries #inprogress'
		);
	});

	it('rewrites inprogress to done', () => {
		expect(rewriteHashtagLine('Feature #inprogress', 'done')).toBe('Feature #done');
	});

	it('rewrites done back to todo', () => {
		expect(rewriteHashtagLine('Task #done', 'todo')).toBe('Task #todo');
	});

	it('rewrites a case-variant hashtag to the lowercase status', () => {
		expect(rewriteHashtagLine('Task #TODO', 'done')).toBe('Task #done');
	});

	it('leaves the line unchanged when the status already matches', () => {
		expect(rewriteHashtagLine('Task #todo', 'todo')).toBe('Task #todo');
	});
});

describe('rewriteChecklistLine', () => {
	it('checks the box when moving to done', () => {
		expect(rewriteChecklistLine('- [ ] Buy milk', 'done')).toBe('- [x] Buy milk');
	});

	it('clears the box when moving to todo', () => {
		expect(rewriteChecklistLine('- [x] Buy milk', 'todo')).toBe('- [ ] Buy milk');
	});

	it('clears a tilde marker when moving to todo', () => {
		expect(rewriteChecklistLine('- [~] Buy milk', 'todo')).toBe('- [ ] Buy milk');
	});

	it('preserves leading indentation', () => {
		expect(rewriteChecklistLine('  - [ ] Nested', 'done')).toBe('  - [x] Nested');
	});

	it('is a no-op when moving a checklist item to inprogress (no checklist marker for it)', () => {
		expect(rewriteChecklistLine('- [ ] Buy milk', 'inprogress')).toBe('- [ ] Buy milk');
	});
});
