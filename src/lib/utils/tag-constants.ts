export const SYSTEM_TAGS = {
	JOURNAL: 'journal',
	TODO: 'todo',
	DONE: 'done',
	INPROGRESS: 'inprogress',
} as const;

export type SystemTag = (typeof SYSTEM_TAGS)[keyof typeof SYSTEM_TAGS];
