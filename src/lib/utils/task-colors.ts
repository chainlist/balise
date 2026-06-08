import type { TaskStatus } from './task-parser';

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
	todo: 'oklch(0.65 0.18 240)',
	inprogress: 'oklch(0.75 0.18 85)',
	done: 'oklch(0.65 0.18 145)'
};
