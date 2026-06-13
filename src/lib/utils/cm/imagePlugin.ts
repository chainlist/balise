import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range, EditorState } from '@codemirror/state';
import { StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';
import ImageViewer from '$lib/components/cm/ImageViewer.svelte';
import { fsService } from '$lib/services/fs';
import { SvelteWidget } from './shared';

// --- Alt text ---

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

// --- Widget ---

type ImageProps = { path: string; alt: string; onAltChange: (alt: string) => void };

class ImageWidget extends SvelteWidget<ImageProps> {
	protected component = ImageViewer;
	protected tagName = 'div' as const;
	#el: HTMLElement | null = null;

	constructor(
		readonly path: string,
		readonly alt: string
	) {
		super();
	}

	protected setup(el: HTMLElement) {
		this.#el = el;
	}

	protected getProps(view: EditorView): ImageProps {
		return {
			path: this.path,
			alt: this.alt,
			onAltChange: (alt: string) => {
				if (this.#el) updateAlt(view, this.#el, alt);
			}
		};
	}

	eq(other: ImageWidget): boolean {
		return other.path === this.path && other.alt === this.alt;
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

// Block widgets must come from a StateField. We iterate the full doc (no
// viewport culling needed — block widgets are cheap and images are sparse).
// Images always render as widgets, regardless of mark mode: the raw markdown
// is never useful to look at, and revealing it on cursor entry makes the
// document jump.
function buildDecos(state: EditorState): DecorationSet {
	const ranges: Range<Decoration>[] = [];

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'Image') return;

			let path = '';
			for (let child = node.node.firstChild; child; child = child.nextSibling) {
				if (child.name === 'URL') {
					path = state.doc.sliceString(child.from, child.to).trim();
					break;
				}
			}
			if (!path) return false;

			const altRange = imageAltRange(node.node);
			const alt = altRange ? state.doc.sliceString(altRange.from, altRange.to) : '';

			const line = state.doc.lineAt(node.to);
			const lineFrom = state.doc.lineAt(node.from).from;
			ranges.push(
				Decoration.line({ attributes: { style: 'display:none' } }).range(lineFrom),
				Decoration.replace({}).range(lineFrom, line.to),
				Decoration.widget({ widget: new ImageWidget(path, alt), block: true, side: 1 }).range(line.to)
			);
			return false;
		}
	});

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

// --- Plugin ---

export function mdImagePlugin() {
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
