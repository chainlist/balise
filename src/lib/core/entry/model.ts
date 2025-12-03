export interface Entry {
	id: string;
	content: string;
	fixed?: boolean;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	focused?: boolean;
	parentId?: string;
	createdAt: Date;
	updatedAt: Date;
}

export type NewEntry = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>;
