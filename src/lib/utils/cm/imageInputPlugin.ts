import { EditorView } from '@codemirror/view';
import { BaseDirectory, mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { DESKS_ROOT_DIR, sanitizeDeskName } from '$lib/services/desk';

function extFromType(type: string): string {
	const sub = type.split('/')[1] ?? 'bin';
	if (sub === 'jpeg') return 'jpg';
	if (sub.includes('+')) return sub.split('+')[0];
	return sub;
}

async function saveImage(blob: Blob, deskName: string): Promise<string> {
	const ext = extFromType(blob.type);
	const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
	const safeDesk = sanitizeDeskName(deskName);
	const attachmentsPath = `${DESKS_ROOT_DIR}/${safeDesk}/attachments`;

	await mkdir(attachmentsPath, { baseDir: BaseDirectory.Document, recursive: true });

	const buffer = await blob.arrayBuffer();
	await writeFile(`${attachmentsPath}/${filename}`, new Uint8Array(buffer), {
		baseDir: BaseDirectory.Document
	});

	return filename;
}

function insertImageMarkdown(view: EditorView, filename: string) {
	const markdown = `![](attachments/${filename})`;
	const pos = view.state.selection.main.from;
	view.dispatch({
		changes: { from: pos, insert: markdown },
		selection: { anchor: pos + markdown.length }
	});
}

export function mdImageInputPlugin(deskName: string) {
	return EditorView.domEventHandlers({
		paste(event, view) {
			const items = event.clipboardData?.items;
			if (!items) return false;

			for (const item of items) {
				if (!item.type.startsWith('image/')) continue;
				const blob = item.getAsFile();
				if (!blob) continue;

				event.preventDefault();
				saveImage(blob, deskName).then((filename) => insertImageMarkdown(view, filename));
				return true;
			}

			return false;
		},

		dragover(event) {
			if ([...( event.dataTransfer?.items ?? [])].some((i) => i.type.startsWith('image/'))) {
				event.preventDefault();
			}
		},

		drop(event, view) {
			const files = [...(event.dataTransfer?.files ?? [])].filter((f) =>
				f.type.startsWith('image/')
			);
			if (!files.length) return false;

			event.preventDefault();
			for (const file of files) {
				saveImage(file, deskName).then((filename) => insertImageMarkdown(view, filename));
			}
			return true;
		}
	});
}
