import { toPng, toJpeg } from 'html-to-image';
import type { RasterImage } from '$lib/services/export';

// Presentation helper: turns a rendered note element into encoded image bytes.
// This is the one place html-to-image is used, and it keeps the DOM work out of
// `exportService`, which only sequences (encode → dialog → write).

/** Draw at 2x so text stays crisp when the export is zoomed or printed. */
const PIXEL_RATIO = 2;

/** High enough that JPEG artefacts stay invisible on text, low enough that a long
 *  note does not produce a huge PDF. */
const JPEG_QUALITY = 0.95;

function dataUrlToBytes(dataUrl: string): Uint8Array {
	const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/**
 * Rasterise a note element. The background is painted explicitly: the offscreen
 * node is transparent, and a transparent JPEG decodes to black.
 */
export async function rasterizeNode(
	node: HTMLElement,
	encoding: 'png' | 'jpeg'
): Promise<RasterImage> {
	const backgroundColor = getComputedStyle(node).backgroundColor;
	const options = { pixelRatio: PIXEL_RATIO, backgroundColor, cacheBust: true };

	const dataUrl =
		encoding === 'jpeg'
			? await toJpeg(node, { ...options, quality: JPEG_QUALITY })
			: await toPng(node, options);

	return {
		bytes: dataUrlToBytes(dataUrl),
		width: node.offsetWidth * PIXEL_RATIO,
		height: node.offsetHeight * PIXEL_RATIO
	};
}
