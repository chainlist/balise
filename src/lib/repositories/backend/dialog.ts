import { open } from '@tauri-apps/plugin-dialog';

// Backend seam for the native file dialog: the only module importing
// `@tauri-apps/plugin-dialog`. Mirrors how `fs.ts` is the sole importer of the
// fs plugin, keeping Tauri access inside the data-access layer.

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'];

/** Open the native single-file image picker. Returns the absolute path of the
 *  chosen file, or null when the user cancels. */
export async function openImageFile(): Promise<string | null> {
	const selected = await open({
		multiple: false,
		directory: false,
		filters: [{ name: 'Image', extensions: IMAGE_EXTENSIONS }]
	});
	return typeof selected === 'string' ? selected : null;
}
