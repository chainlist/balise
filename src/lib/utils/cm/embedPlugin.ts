import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range, EditorState } from '@codemirror/state';
import { StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';
import EmbedViewer from '$lib/components/cm/EmbedViewer.svelte';
import { assetsService } from '$lib/services/assets';
import { BARE_URL_RE, SvelteWidget } from './shared';

// --- URL + text extraction ---

// The URL child of an Image (`![alt](url)`) node.
function urlChild(node: SyntaxNode, state: EditorState): string {
	for (let child = node.firstChild; child; child = child.nextSibling) {
		if (child.name === 'URL') return state.doc.sliceString(child.from, child.to).trim();
	}
	return '';
}

// The alt text sits between the first two LinkMark children (`![` … `]`).
function bracketTextRange(node: SyntaxNode): { from: number; to: number } | null {
	let open: number | null = null;
	for (let child = node.firstChild; child; child = child.nextSibling) {
		if (child.name !== 'LinkMark') continue;
		if (open === null) open = child.to;
		else return { from: open, to: child.from };
	}
	return null;
}

// The start offset of the first non-blank line, or -1 when the doc is all blank.
// An image opening the note (alt `cover`) on this line renders as a full-bleed
// cover banner instead of an inline image.
function firstNonEmptyLineFrom(state: EditorState): number {
	for (let i = 1; i <= state.doc.lines; i++) {
		const line = state.doc.line(i);
		if (line.text.trim() !== '') return line.from;
	}
	return -1;
}

// Find the first Image node overlapping [from, to]. Positions captured at widget
// build time go stale as the doc changes, so the alt/toggle actions re-resolve
// the node from the widget's live line.
function findImage(state: EditorState, from: number, to: number): SyntaxNode | null {
	let found: SyntaxNode | null = null;
	syntaxTree(state).iterate({
		from,
		to,
		enter(node) {
			if (node.name !== 'Image' || found) return;
			found = node.node;
			return false;
		}
	});
	return found;
}

// Resolve the Image node from the widget's live DOM position and rewrite its alt.
function updateAlt(view: EditorView, el: HTMLElement, alt: string): void {
	const line = view.state.doc.lineAt(view.posAtDOM(el));
	const image = findImage(view.state, line.from, line.to);
	const range = image && bracketTextRange(image);
	if (range) view.dispatch({ changes: { from: range.from, to: range.to, insert: alt } });
}

// Drop the leading `!` so the embed becomes a plain `[label](url)` link.
function demoteToLink(view: EditorView, el: HTMLElement): void {
	const line = view.state.doc.lineAt(view.posAtDOM(el));
	const image = findImage(view.state, line.from, line.to);
	if (image) view.dispatch({ changes: { from: image.from, to: image.from + 1 } });
}

// --- Widget ---

type EmbedProps = {
	url: string;
	alt: string;
	cover: boolean;
	onAltChange: (alt: string) => void;
	onToggleEmbed: () => void;
};

class EmbedWidget extends SvelteWidget<EmbedProps> {
	protected component = EmbedViewer;
	protected tagName = 'div' as const;
	#el: HTMLElement | null = null;

	constructor(
		readonly url: string,
		readonly alt: string,
		readonly cover: boolean
	) {
		super();
	}

	protected setup(el: HTMLElement) {
		this.#el = el;
	}

	protected getProps(view: EditorView): EmbedProps {
		return {
			url: this.url,
			alt: this.alt,
			cover: this.cover,
			onAltChange: (alt: string) => {
				if (this.#el) updateAlt(view, this.#el, alt);
			},
			onToggleEmbed: () => {
				if (this.#el) demoteToLink(view, this.#el);
			}
		};
	}

	eq(other: EmbedWidget): boolean {
		return other.url === this.url && other.alt === this.alt && other.cover === this.cover;
	}

	// Let the editor ignore events from the overlay buttons/input so clicks
	// and typing there aren't handled as editor interactions.
	override ignoreEvent(event: Event): boolean {
		return event.target instanceof Element && event.target.closest('button, input') !== null;
	}
}

// --- File saving ---

function insertMarkdown(view: EditorView, pos: number, filename: string): void {
	const text = `![](attachments/${filename})`;
	view.dispatch({
		changes: { from: pos, insert: text },
		selection: { anchor: pos + text.length }
	});
}

// --- Event handlers ---

// A single-line URL / markdown link / image, normalized to image-embed syntax.
// Returns null for anything that isn't a link, so ordinary text pastes through.
function toEmbedMarkdown(text: string): string | null {
	if (/^!\[[^\]]*\]\([^)]+\)$/.test(text)) return text;
	if (/^\[[^\]]*\]\([^)]+\)$/.test(text)) return `!${text}`;
	BARE_URL_RE.lastIndex = 0;
	const m = BARE_URL_RE.exec(text);
	if (m && m[0] === text) return `![](${text})`;
	return null;
}

function handlePaste(event: ClipboardEvent, view: EditorView): boolean {
	const items = event.clipboardData?.items;
	if (items) {
		for (const item of items) {
			if (!item.type.startsWith('image/')) continue;
			const blob = item.getAsFile();
			if (!blob) continue;

			event.preventDefault();
			const pos = view.state.selection.main.from;
			assetsService.saveAttachment(blob).then((filename) => insertMarkdown(view, pos, filename));
			return true;
		}
	}

	// A URL or link pasted onto an otherwise-empty line becomes an embed.
	const text = event.clipboardData?.getData('text/plain')?.trim() ?? '';
	if (!text || text.includes('\n')) return false;
	const markdown = toEmbedMarkdown(text);
	if (!markdown) return false;
	const { from, to } = view.state.selection.main;
	const line = view.state.doc.lineAt(from);
	const before = view.state.doc.sliceString(line.from, from);
	const after = view.state.doc.sliceString(to, line.to);
	if (before.trim() !== '' || after.trim() !== '') return false;

	event.preventDefault();
	view.dispatch({
		changes: { from: line.from, to: line.to, insert: markdown },
		selection: { anchor: line.from + markdown.length }
	});
	return true;
}

function handleDrop(event: DragEvent, view: EditorView): boolean {
	const items = event.dataTransfer?.items;
	if (!items) return false;

	let blob: Blob | null = null;
	for (const item of items) {
		if (item.type.startsWith('image/')) {
			blob = item.getAsFile();
			break;
		}
	}
	if (!blob) return false;

	event.preventDefault();
	const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.doc.length;
	assetsService.saveAttachment(blob).then((filename) => insertMarkdown(view, pos, filename));
	return true;
}

// --- Decoration builder ---

// Replace an element's whole line with a block widget. Anchored at the start of
// the line, not its end: a heading's fold range ends exactly at the last block's
// line end, and a block widget sitting on that boundary is never covered by the
// fold, so an element that's the last block in a section would stay visible when
// the heading is folded. lineFrom is strictly inside the fold range, so it folds.
function pushBlockEmbed(
	ranges: Range<Decoration>[],
	state: EditorState,
	from: number,
	to: number,
	url: string,
	alt: string,
	cover: boolean
): void {
	const line = state.doc.lineAt(to);
	const lineFrom = state.doc.lineAt(from).from;
	ranges.push(
		Decoration.line({ attributes: { style: 'display:none' } }).range(lineFrom),
		Decoration.replace({}).range(lineFrom, line.to),
		Decoration.widget({
			widget: new EmbedWidget(url, alt, cover),
			block: true,
			side: -1
		}).range(lineFrom)
	);
}

// Block widgets must come from a StateField. We iterate the full doc (no
// viewport culling needed — block widgets are cheap and embeds are sparse).
// Only image syntax `![…](url)` is an embed; the embed kind (image/video/link)
// is decided from the URL by EmbedViewer. Plain `[label](url)` links and bare
// URLs stay linkPlugin's chip. Embeds always render as widgets, regardless of
// mark mode: the raw markdown is never useful to look at, and revealing it on
// cursor entry makes the document jump.
function buildDecos(state: EditorState): DecorationSet {
	const ranges: Range<Decoration>[] = [];
	const coverFrom = firstNonEmptyLineFrom(state);

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'Image') return;
			const url = urlChild(node.node, state);
			if (!url) return false;
			const textRange = bracketTextRange(node.node);
			const alt = textRange ? state.doc.sliceString(textRange.from, textRange.to) : '';
			const cover =
				state.doc.lineAt(node.from).from === coverFrom && alt.trim().toLowerCase() === 'cover';
			pushBlockEmbed(ranges, state, node.from, node.to, url, alt, cover);
			return false;
		}
	});

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

// --- Plugin ---

export function mdEmbedPlugin() {
	const blockField = StateField.define<DecorationSet>({
		create: (state) => buildDecos(state),
		update(deco, tr) {
			// Rebuild on doc edits, but also when the syntax tree advances: a long
			// document parses lazily (the tail is only parsed as it scrolls into
			// view), and that parsing arrives via transactions that don't change the
			// doc. Without this, an embed past the initial parse never gets decorated
			// and shows its raw `![](…)` markdown.
			if (tr.docChanged || syntaxTree(tr.startState) != syntaxTree(tr.state))
				return buildDecos(tr.state);
			return deco;
		},
		provide: (f) => EditorView.decorations.from(f)
	});

	const eventsPlugin = ViewPlugin.fromClass(class {}, {
		eventHandlers: {
			paste: handlePaste,
			drop: handleDrop
		}
	});

	return [blockField, eventsPlugin];
}
