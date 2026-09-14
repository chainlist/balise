import { open, save } from '@tauri-apps/plugin-dialog';

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

/** Open the native save dialog for an exported note, seeded with `defaultName`
 *  and filtered to the one extension being written. Returns the chosen absolute
 *  path, or null when the user cancels. */
export async function saveExportFile(
	defaultName: string,
	filterName: string,
	extension: string
): Promise<string | null> {
	return save({
		defaultPath: defaultName,
		filters: [{ name: filterName, extensions: [extension] }]
	});
}
