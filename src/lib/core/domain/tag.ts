// Tags domain: pure extraction (hashtags, code fences, magic patterns), naming
// rules, and types. No I/O, no Svelte, no Tauri. Magic-tag matching takes its
// rules as an argument so the domain never depends on Settings (Concept 07 wires
// `settings.magicTags -> tagsService.magicRules`).

// ─── Types ──────────────────────────────────────────────────────────────────

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

export interface TagOccurrences {
	name: string;
	/** Document offsets of every occurrence, in document order. */
	positions: number[];
}

export const MAGIC_TAG_MATCH_TYPES = {
	STARTS_WITH: 'starts_with',
	ENDS_WITH: 'ends_with',
	CONTAINS: 'contains',
	CONTAINS_WORD: 'contains_word'
} as const;

export type MagicTagMatchType = (typeof MAGIC_TAG_MATCH_TYPES)[keyof typeof MAGIC_TAG_MATCH_TYPES];

export interface MagicTagRule {
	tag: string;
	pattern: string;
	matchType: MagicTagMatchType;
}

export const SYSTEM_TAGS = {
	JOURNAL: 'journal',
	TODO: 'todo',
	DONE: 'done',
	INPROGRESS: 'inprogress'
} as const;

export type SystemTag = (typeof SYSTEM_TAGS)[keyof typeof SYSTEM_TAGS];

/** Sentinel filter value for "notes with no tags". */
export const UNTAGGED_FILTER = '__untagged__' as const;

// ─── Naming ───────────────────────────────────────────────────────────────────

export function tagDisplayName(tag: { display_name: string | null; tag: string }): string {
	return tag.display_name ?? tag.tag;
}

// ─── Hashtag parsing (with positions) ───────────────────────────────────────────

const TAG_PATTERN_SOURCE = String.raw`#([a-zA-Z0-9/]{2,})(?:\(([^)]+)\))?`;

interface HashtagMatch {
	name: string;
	index: number;
}

/**
 * A `#…` sequence inside an inline-HTML tag (the hex in
 * `<span style="color: #fff">`, an `<a href="#x">` anchor, …) is markup, not a
 * tag: it sits between a `<` and the tag's closing `>` on the same line.
 */
function isInsideHtmlTag(text: string, hashIndex: number): boolean {
	for (let i = hashIndex - 1; i >= 0; i--) {
		const ch = text[i];
		if (ch === '<') return true;
		if (ch === '>' || ch === '\n') return false;
	}
	return false;
}

function parseAllHashtags(text: string): HashtagMatch[] {
	const re = new RegExp(TAG_PATTERN_SOURCE, 'g');
	const results: HashtagMatch[] = [];
	for (const match of text.matchAll(re)) {
		if (isInsideHtmlTag(text, match.index)) continue;
		results.push({ name: match[1], index: match.index });
	}
	return results;
}

/**
 * Group every hashtag in `text` by name (case-insensitive, first-seen casing
 * kept for display), in order of first appearance. Each group lists the offsets
 * of all its occurrences so the editor header can cycle through them.
 */
export function groupHashtagOccurrences(text: string): TagOccurrences[] {
	const groups = new Map<string, TagOccurrences>();
	for (const { name, index } of parseAllHashtags(text)) {
		const key = name.toLowerCase();
		const existing = groups.get(key);
		if (existing) existing.positions.push(index);
		else groups.set(key, { name, positions: [index] });
	}
	return [...groups.values()];
}

// ─── Code-fence language tags ───────────────────────────────────────────────────

/** Fenced code block opener, capture group 1 is the language. Use with `gm`. */
const FENCE_LANG_SOURCE = '^```([a-zA-Z][a-zA-Z0-9]*)';

/** Every fenced block with a language yields `code` plus the lowercased language. */
export function extractCodeTags(content: string): string[] {
	const tags: string[] = [];
	for (const [, lang] of content.matchAll(new RegExp(FENCE_LANG_SOURCE, 'gm'))) {
		tags.push('code', lang.toLowerCase());
	}
	return tags;
}

// ─── Magic tags (pattern matching, settings-free) ────────────────────────────────

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Tags whose user-defined pattern matches the content, deduped, no I/O. */
export function matchMagicTags(content: string, rules: MagicTagRule[]): string[] {
	if (rules.length === 0) return [];

	const found = new Set<string>();

	for (const matchType of Object.values(MAGIC_TAG_MATCH_TYPES)) {
		const ofType = rules.filter((t) => t.matchType === matchType);
		if (ofType.length === 0) continue;

		let re: RegExp;
		if (matchType === MAGIC_TAG_MATCH_TYPES.CONTAINS_WORD) {
			const groups = ofType
				.map(({ pattern }) => `(?:(?<=^|[ \\t])(${escapeRegex(pattern)})(?=[ \\t]|$))`)
				.join('|');
			re = new RegExp(groups, 'gm');
		} else {
			const groups = ofType.map(({ pattern }) => `(${escapeRegex(pattern)})`).join('|');
			if (matchType === MAGIC_TAG_MATCH_TYPES.STARTS_WITH)
				re = new RegExp(`^[ \\t]*(?:${groups})`, 'gm');
			else if (matchType === MAGIC_TAG_MATCH_TYPES.ENDS_WITH)
				re = new RegExp(`(?:${groups})[ \\t]*$`, 'gm');
			else re = new RegExp(`(?:${groups})`, 'gm');
		}

		for (const match of content.matchAll(re)) {
			const idx = match.slice(1).findIndex((g) => g !== undefined);
			if (idx >= 0) found.add(ofType[idx].tag);
		}
	}

	return [...found];
}

// ─── Composition ─────────────────────────────────────────────────────────────────

/**
 * Every tag a note carries, in display order, as the single source of truth for
 * both persistence and the editor header. Literal `#hashtags` keep their document
 * offsets so the header can cycle through each occurrence; derived tags (code
 * fences, magic patterns) have no literal `#tag` to jump to, so they come back
 * with empty `positions` and render as static chips.
 */
export function getTagsForNote(content: string, rules: MagicTagRule[]): TagOccurrences[] {
	const groups = groupHashtagOccurrences(content);
	const seen = new Set(groups.map((g) => g.name.toLowerCase()));

	for (const name of [...extractCodeTags(content), ...matchMagicTags(content, rules)]) {
		const key = name.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		groups.push({ name, positions: [] });
	}

	return groups;
}

export function extractTags(content: string, rules: MagicTagRule[]): string[] {
	return getTagsForNote(content, rules).map((t) => t.name);
}
