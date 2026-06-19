import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range, EditorState } from '@codemirror/state';
import { StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';
import EmbedViewer from '$lib/components/cm/EmbedViewer.svelte';
import { fsService } from '$lib/services/platform/fs';
import { matchEmbed } from './embeds.config';
import { BARE_URL_RE, SvelteWidget } from './shared';

// --- URL + alt extraction ---

// The URL child is shared by Image (`![alt](url)`) and Link (`[label](url)`) nodes.
function urlChild(node: SyntaxNode, state: EditorState): string {
	for (let child = node.firstChild; child; child = child.nextSibling) {
		if (child.name === 'URL') return state.doc.sliceString(child.from, child.to).trim();
	}
	return '';
}

// The alt text sits between the first two LinkMark children: `![` and `]`.
function imageAltRange(node: SyntaxNode): { from: number; to: number } | null {
	let open: number | null = null;
	for (let child = node.firstChild; child; child = child.nextSibling) {
		if (child.name !== 'LinkMark') continue;
		if (open === null) open = child.to;
		else return { from: open, to: child.from };
	}
	return null;
}

// Find the alt range of the first Image node overlapping [from, to].
function findAltRange(
	state: EditorState,
	from: number,
	to: number
): { from: number; to: number } | null {
	let range: { from: number; to: number } | null = null;
	syntaxTree(state).iterate({
		from,
		to,
		enter(node) {
			if (node.name !== 'Image' || range) return;
			range = imageAltRange(node.node);
			return false;
		}
	});
	return range;
}

// Resolve the Image node from the widget's live DOM position (positions
// captured at build time go stale as the doc changes) and rewrite its alt.
function updateAlt(view: EditorView, el: HTMLElement, alt: string): void {
	const line = view.state.doc.lineAt(view.posAtDOM(el));
	const range = findAltRange(view.state, line.from, line.to);
	if (range) view.dispatch({ changes: { from: range.from, to: range.to, insert: alt } });
}

// --- Embed detection (shared with linkPlugin) ---

// Is the element the sole (non-whitespace) content of its line?
function ownsLine(state: EditorState, from: number, to: number): boolean {
	const line = state.doc.lineAt(from);
	if (to > line.to) return false;
	const before = state.doc.sliceString(line.from, from);
	const after = state.doc.sliceString(to, line.to);
	return before.trim() === '' && after.trim() === '';
}

// A Link is rendered as a block embed only when its URL is a known embed host
// AND it is alone on its line. Inline links (and non-embed links) keep their
// linkPlugin chip. linkPlugin imports this to skip the links this plugin
// claims, so the two never decorate the same range.
export function isLinkEmbed(state: EditorState, link: SyntaxNode): boolean {
	const href = urlChild(link, state);
	if (!href || !matchEmbed(href)) return false;
	return ownsLine(state, link.from, link.to);
}

// Bare URLs (no brackets) aren't syntax-tree nodes; they're regex-matched. A
// bare video URL alone on its line embeds too. linkPlugin imports this to skip
// the bare URLs this plugin claims.
export function isBareUrlEmbed(
	state: EditorState,
	from: number,
	to: number,
	text: string
): boolean {
	return !!matchEmbed(text) && ownsLine(state, from, to);
}

// Mirror forEachBareUrl's exclusion: a bare URL inside a link or code construct
// is never an embed.
function inLinkOrCode(state: EditorState, pos: number): boolean {
	for (let cur = syntaxTree(state).resolveInner(pos, 1); cur.parent; cur = cur.parent) {
		const n = cur.name;
		if (n === 'Link' || n === 'InlineCode' || n === 'FencedCode' || n === 'CodeBlock') return true;
	}
	return false;
}

// --- Widget ---

type EmbedProps = { url: string; alt: string; onAltChange: (alt: string) => void };

class EmbedWidget extends SvelteWidget<EmbedProps> {
	protected component = EmbedViewer;
	protected tagName = 'div' as const;
	#el: HTMLElement | null = null;

	constructor(
		readonly url: string,
		readonly alt: string
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
			onAltChange: (alt: string) => {
				if (this.#el) updateAlt(view, this.#el, alt);
			}
		};
	}

	eq(other: EmbedWidget): boolean {
		return other.url === this.url && other.alt === this.alt;
	}

	// Let the editor ignore events from the description button/input so
	// clicks and typing there aren't handled as editor interactions.
	override ignoreEvent(event: Event): boolean {
		return event.target instanceof Element && event.target.closest('button, input') !== null;
	}
}

// --- File saving ---

function extFromMime(mimeType: string): string {
	return (mimeType.split('/')[1] ?? 'png').replace(/\+.*$/, '');
}

async function saveAttachment(blob: Blob): Promise<string> {
	const ext = extFromMime(blob.type);
	const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
	await fsService.mkdir('attachments');
	const buffer = await blob.arrayBuffer();
	await fsService.writeFile(`attachments/${filename}`, new Uint8Array(buffer));
	return filename;
}

function insertMarkdown(view: EditorView, pos: number, filename: string): void {
	const text = `![](attachments/${filename})`;
	view.dispatch({
		changes: { from: pos, insert: text },
		selection: { anchor: pos + text.length }
	});
}

// --- Event handlers ---

function handlePaste(event: ClipboardEvent, view: EditorView): boolean {
	const items = event.clipboardData?.items;
	if (!items) return false;

	for (const item of items) {
		if (!item.type.startsWith('image/')) continue;
		const blob = item.getAsFile();
		if (!blob) continue;

		event.preventDefault();
		const pos = view.state.selection.main.from;
		saveAttachment(blob).then((filename) => insertMarkdown(view, pos, filename));
		return true;
	}

	return false;
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
	saveAttachment(blob).then((filename) => insertMarkdown(view, pos, filename));
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
	alt: string
): void {
	const line = state.doc.lineAt(to);
	const lineFrom = state.doc.lineAt(from).from;
	ranges.push(
		Decoration.line({ attributes: { style: 'display:none' } }).range(lineFrom),
		Decoration.replace({}).range(lineFrom, line.to),
		Decoration.widget({ widget: new EmbedWidget(url, alt), block: true, side: -1 }).range(lineFrom)
	);
}

// Block widgets must come from a StateField. We iterate the full doc (no
// viewport culling needed — block widgets are cheap and embeds are sparse).
// Embeds always render as widgets, regardless of mark mode: the raw markdown
// is never useful to look at, and revealing it on cursor entry makes the
// document jump.
function buildDecos(state: EditorState): DecorationSet {
	const ranges: Range<Decoration>[] = [];

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name === 'Image') {
				const url = urlChild(node.node, state);
				if (!url) return false;
				const altRange = imageAltRange(node.node);
				const alt = altRange ? state.doc.sliceString(altRange.from, altRange.to) : '';
				pushBlockEmbed(ranges, state, node.from, node.to, url, alt);
				return false;
			}
			if (node.name === 'Link') {
				if (!isLinkEmbed(state, node.node)) return false;
				pushBlockEmbed(ranges, state, node.from, node.to, urlChild(node.node, state), '');
				return false;
			}
		}
	});

	// Bare video URLs alone on their own line (paste-to-embed). Inline bare URLs
	// and non-video URLs stay linkPlugin's chip. Uses the same BARE_URL_RE span as
	// linkPlugin so the two agree on which URLs are embeds.
	for (let i = 1; i <= state.doc.lines; i++) {
		const line = state.doc.line(i);
		BARE_URL_RE.lastIndex = 0;
		const m = BARE_URL_RE.exec(line.text);
		if (!m) continue;
		const from = line.from + m.index;
		const to = from + m[0].length;
		if (!isBareUrlEmbed(state, from, to, m[0]) || inLinkOrCode(state, from)) continue;
		pushBlockEmbed(ranges, state, from, to, m[0], '');
	}

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

// --- Plugin ---

export function mdEmbedPlugin() {
	const blockField = StateField.define<DecorationSet>({
		create: (state) => buildDecos(state),
		update(deco, tr) {
			if (tr.docChanged) return buildDecos(tr.state);
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
