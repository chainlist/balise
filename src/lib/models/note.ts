export interface Note {
	id: string;
	title: string;
	preview: string;
	content?: string;
	pinned: boolean;
	archived: boolean;
	created_at: string;
	updated_at: string;
}

export type NoteSearchResult = { id: string; title: string; excerpt: string | null };
