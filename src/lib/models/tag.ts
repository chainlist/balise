export interface Tag {
	tag: string;
	color: string | null;
	display_name: string | null;
	pinned: boolean;
	count: number;
}

export interface RelatedTag {
	tag: string;
	color: string | null;
	display_name: string | null;
}
