import {
	EXPORT_FORMATS,
	exportExtension,
	exportFileName,
	buildSinglePagePdf,
	type ExportFormat
} from '$lib/domain/export';
import { saveExportFile } from '$lib/repositories/backend/dialog';
import { writeExportFile } from '$lib/repositories/backend/tauri';
import * as m from '$paraglide/messages.js';

// Application layer for note export: picks the raster encoding each format needs,
// wraps a PDF around the result, asks for a destination, and writes. Rasterising
// is a DOM job, so it stays in presentation and arrives here as the `rasterize`
// callback — this service never touches a node.

/** A rasterised note: the encoded bytes plus the pixel size they were drawn at,
 *  which the PDF page needs to keep the aspect ratio. */
export interface RasterImage {
	bytes: Uint8Array;
	width: number;
	height: number;
}

/** Draws the note at the requested encoding. Supplied by the component that owns
 *  the offscreen render. */
export type Rasterizer = (encoding: 'png' | 'jpeg') => Promise<RasterImage>;

class ExportService {
	/**
	 * Export one note. Returns false when the user cancels the save dialog, so the
	 * caller can stay silent instead of reporting a success that did not happen.
	 *
	 * PDF is a raster too: it rasterises to JPEG and wraps those bytes in a
	 * single-page document, which is why the encoding is chosen here rather than
	 * by the caller.
	 */
	async exportNote(rasterize: Rasterizer, format: ExportFormat, title: string): Promise<boolean> {
		const isPdf = format === EXPORT_FORMATS.PDF;
		const image = await rasterize(isPdf ? 'jpeg' : format);
		const bytes = isPdf ? buildSinglePagePdf(image.bytes, image.width, image.height) : image.bytes;

		const extension = exportExtension(format);
		const path = await saveExportFile(
			exportFileName(title, format, m.note_untitled()),
			extension.toUpperCase(),
			extension
		);
		if (!path) return false;

		await writeExportFile(path, bytes);
		return true;
	}
}

export const exportService = new ExportService();
