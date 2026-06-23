// Notes domain: the `Note` aggregate (builds, validates, and derives title /
// preview / tags), the lightweight `NoteListItem` projection that backs the
// virtual-scrolled list, the on-disk `{id}.md` file format, and the pure
// new-note template. No I/O, no Svelte, no Tauri. Tag derivation takes its magic
// rules as an argument (the Concept 01 seam), so the domain never depends on
// Settings.

import { newId } from './shared/id';
import { toSqliteUtc } from './shared/time';
import { extractTitle, notePreview } from './shared/markdown';
import { extractTags, UNTAGGED_FILTER, type MagicTagRule } from './tag';

// ─── Types ──────────────────────────────────────────────────────────────────

/** The visible list uses lightweight rows without `content`, for the
 *  virtual-scroll perf the app relies on. The full `Note` (with content) is
 *  loaded only when a note is opened or written. */
export interface NoteListItem {
	id: string;
	title: string;
	preview: string;
	pinned: boolean;
	archived: boolean;
	createdAt: string;
	updatedAt: string;
}

export type NoteSearchResult = { id: string; title: string; excerpt: string | null };

/** A note's id, title, and raw content — the projection the task board parses its
 *  task lines out of (it needs the body, which {@link NoteListItem} omits). */
export interface NoteContentItem {
	id: string;
	title: string;
	content: string;
}

/** A note's persisted column shape, ready for SQL params (flags as 0/1,
 *  snake_case dates). The repo decides column order; this just projects. */
export interface NoteRow {
	id: string;
	content: string;
	title: string;
	preview: string;
	pinned: number;
	archived: number;
	created_at: string;
	updated_at: string;
}

/** Overrides for {@link Note.create}: pin the id, timestamps, or flags instead of
 *  taking a fresh id and "now" (journal day notes, sync imports). */
interface CreateOptions {
	id?: string;
	createdAt?: string;
	updatedAt?: string;
	pinned?: boolean;
	archived?: boolean;
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

export class Note {
	private constructor(
		readonly id: string,
		readonly content: string,
		readonly title: string,
		readonly preview: string,
		readonly tags: string[],
		readonly pinned: boolean,
		readonly archived: boolean,
		readonly createdAt: string,
		readonly updatedAt: string
	) {}

	/**
	 * Build a note from raw content, deriving title, preview, and tags. Empty
	 * content is allowed (the editor seeds a template), so there is no not-empty
	 * guard. Everything omitted from `opts` defaults to a fresh id and "now".
	 */
	static create(content: string, magicRules: MagicTagRule[], opts: CreateOptions = {}): Note {
		const now = toSqliteUtc(new Date());
		return new Note(
			opts.id ?? newId(),
			content,
			extractTitle(content),
			notePreview(content),
			extractTags(content, magicRules),
			opts.pinned ?? false,
			opts.archived ?? false,
			opts.createdAt ?? now,
			opts.updatedAt ?? now
		);
	}

	/** Re-derive title / preview / tags for edited content and bump `updatedAt`;
	 *  id, creation time, and flags are preserved. */
	withContent(content: string, magicRules: MagicTagRule[]): Note {
		return new Note(
			this.id,
			content,
			extractTitle(content),
			notePreview(content),
			extractTags(content, magicRules),
			this.pinned,
			this.archived,
			this.createdAt,
			toSqliteUtc(new Date())
		);
	}

	/** Reconstitute the immutable shell (id, flags, timestamps) from a stored list
	 *  item, so an edit can `withContent` without a content round trip. Content and
	 *  tags stay empty until `withContent` supplies them. */
	static fromListItem(item: NoteListItem): Note {
		return new Note(
			item.id,
			'',
			item.title,
			item.preview,
			[],
			item.pinned,
			item.archived,
			item.createdAt,
			item.updatedAt
		);
	}

	toListItem(): NoteListItem {
		return {
			id: this.id,
			title: this.title,
			preview: this.preview,
			pinned: this.pinned,
			archived: this.archived,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}

	toRow(): NoteRow {
		return {
			id: this.id,
			content: this.content,
			title: this.title,
			preview: this.preview,
			pinned: this.pinned ? 1 : 0,
			archived: this.archived ? 1 : 0,
			created_at: this.createdAt,
			updated_at: this.updatedAt
		};
	}

	/** The on-disk `{id}.md` representation: YAML frontmatter + body. Must stay
	 *  byte-for-byte compatible with the Rust writer/reader in
	 *  `src-tauri/src/sync/note_file.rs`. */
	buildFile(): string {
		return (
			`---\n` +
			`id: ${this.id}\n` +
			`pinned: ${this.pinned}\n` +
			`archived: ${this.archived}\n` +
			`created_at: ${this.createdAt}\n` +
			`updated_at: ${this.updatedAt}\n` +
			`---\n` +
			this.content
		);
	}

	/** Parse a `{id}.md` file back into a Note, re-deriving title / preview / tags
	 *  from the body. The inverse of {@link buildFile} for the persisted fields. */
	static fromFile(text: string, magicRules: MagicTagRule[] = []): Note {
		const fm = parseFrontmatter(text);
		const content = stripFrontmatter(text);
		const now = toSqliteUtc(new Date());
		return new Note(
			fm.id ?? newId(),
			content,
			extractTitle(content),
			notePreview(content),
			extractTags(content, magicRules),
			fm.pinned ?? false,
			fm.archived ?? false,
			fm.created_at ?? now,
			fm.updated_at ?? now
		);
	}
}

// ─── New-note template (pure) ────────────────────────────────────────────────

/** Seed content for a new note: an `### ` heading and, when a real tag is active,
 *  its hashtag. The service injects `titleText` (a paraglide message) so the
 *  domain stays framework-free. */
export function newNoteContent(titleText: string, activeTag: string | null): string {
	return (
		`### ${titleText}\n\n` + (activeTag && activeTag !== UNTAGGED_FILTER ? `#${activeTag}\n\n` : '')
	);
}

// ─── Frontmatter parsing (mirrors the Rust reader) ────────────────────────────

interface ParsedFrontmatter {
	id?: string;
	pinned?: boolean;
	archived?: boolean;
	created_at?: string;
	updated_at?: string;
}

/** Read the leading `---` block, the same keys {@link Note.buildFile} emits. An
 *  empty result when the text doesn't open with a `---\n` delimiter. */
function parseFrontmatter(text: string): ParsedFrontmatter {
	if (!text.startsWith('---\n')) return {};
	const end = text.indexOf('\n---\n', 4);
	if (end === -1) return {};

	const fm: ParsedFrontmatter = {};
	for (const line of text.slice(4, end).split('\n')) {
		const colon = line.indexOf(':');
		if (colon === -1) continue;
		const key = line.slice(0, colon).trim();
		const value = line.slice(colon + 1).trim();
		switch (key) {
			case 'id':
				fm.id = value;
				break;
			case 'pinned':
				fm.pinned = value === 'true' || value === '1';
				break;
			case 'archived':
				fm.archived = value === 'true' || value === '1';
				break;
			case 'created_at':
				fm.created_at = value;
				break;
			case 'updated_at':
				fm.updated_at = value;
				break;
		}
	}
	return fm;
}

/** The note body with its leading `---` frontmatter block removed. */
function stripFrontmatter(text: string): string {
	if (!text.startsWith('---\n')) return text;
	const end = text.indexOf('\n---\n', 4);
	return end === -1 ? text : text.slice(end + 5);
}
