import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import type { Range, EditorState } from '@codemirror/state';
import { StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import ImageViewer from '$lib/components/cm/ImageViewer.svelte';
import { fsService } from '$lib/services/fs';
import { SvelteWidget, isRevealed, type MarkMode } from './shared';

// --- Widget ---

class ImageWidget extends SvelteWidget<{ path: string }> {
	protected component = ImageViewer;
	protected tagName = 'div' as const;
	protected ignoreEvents = false;

	constructor(readonly path: string) {
		super();
	}

	protected getProps() {
		return { path: this.path };
	}

	eq(other: ImageWidget): boolean {
		return other.path === this.path;
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
function buildDecos(state: EditorState, mode: MarkMode): DecorationSet {
	if (mode === 'always') return Decoration.none;

	const cursorLine = state.doc.lineAt(state.selection.main.head).number;
	const ranges: Range<Decoration>[] = [];

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name !== 'Image') return;
			if (isRevealed(mode, state.doc.lineAt(node.from).number, cursorLine)) return false;

			let path = '';
			for (let child = node.node.firstChild; child; child = child.nextSibling) {
				if (child.name === 'URL') {
					path = state.doc.sliceString(child.from, child.to).trim();
					break;
				}
			}
			if (!path) return false;

			const line = state.doc.lineAt(node.to);
			const lineFrom = state.doc.lineAt(node.from).from;
			ranges.push(
				Decoration.line({ attributes: { style: 'display:none' } }).range(lineFrom),
				Decoration.replace({}).range(lineFrom, line.to),
				Decoration.widget({ widget: new ImageWidget(path), block: true, side: 1 }).range(line.to)
			);
			return false;
		}
	});

	ranges.sort((a, b) => a.from - b.from);
	return Decoration.set(ranges, true);
}

// --- Plugin ---

export function mdImagePlugin(mode: MarkMode) {
	const blockField = StateField.define<DecorationSet>({
		create: (state) => buildDecos(state, mode),
		update(deco, tr) {
			if (tr.docChanged || tr.selection) return buildDecos(tr.state, mode);
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
