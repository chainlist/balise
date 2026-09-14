import { mount, tick, unmount } from 'svelte';
import TagChip from '$lib/components/cm/TagChip.svelte';
import Checkbox from '$lib/components/cm/Checkbox.svelte';
import SignalHeader from '$lib/components/cm/SignalHeader.svelte';
import EmbedLinkViewer from '$lib/components/cm/EmbedLinkViewer.svelte';
import { assetsService } from '$lib/services/assets';
import { linkPreviewService } from '$lib/services/link-preview';
import type { SignalType } from '$lib/utils/markdown-patterns';

// Fills in what `renderExportHtml` could only leave a placeholder for, then turns
// every image into local bytes. Both halves have to happen before the raster: the
// editor draws its chips and cards with Svelte components (mounted here, so the
// export shows the same thing the editor does), and html-to-image re-reads each
// image through `fetch`, which a cross-origin URL will not survive.

/** The extensions an image can be attached with, mapped to the type its blob
 *  needs. The rasteriser rebuilds each image from its blob's Content-Type, and a
 *  typeless blob yields an undecodable `data:;base64,…` source. */
const IMAGE_MIME: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	avif: 'image/avif',
	svg: 'image/svg+xml',
	bmp: 'image/bmp',
	ico: 'image/x-icon'
};

function mimeOf(path: string): string {
	const ext = path.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
	return IMAGE_MIME[ext] ?? 'image/png';
}

/** Desk-relative paths come from disk, everything else off the network. */
function readBytes(source: string): Promise<{ bytes: Uint8Array; mime: string }> {
	if (/^https?:\/\//i.test(source)) return assetsService.readRemoteImage(source);
	return assetsService.readImage(source).then((bytes) => ({ bytes, mime: mimeOf(source) }));
}

async function inlineImage(img: HTMLImageElement, objectUrls: string[]): Promise<void> {
	const source = img.dataset.src ?? img.getAttribute('src') ?? '';
	if (!source || source.startsWith('data:') || source.startsWith('blob:')) return;

	try {
		const { bytes, mime } = await readBytes(source);
		const type = mime.split(';')[0].trim() || mimeOf(source);
		const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
		objectUrls.push(url);
		img.src = url;
		await img.decode();
	} catch {
		// A missing attachment or an unreachable thumbnail must not fail the whole
		// export, so it is hidden the way OgCard hides an image that will not load.
		img.style.display = 'none';
	}
}

export interface ExportHydration {
	/** Unmount the components and release the blob URLs this run created. */
	dispose(): void;
}

/** Fill the export page's placeholders and wait until it is ready to rasterise. */
export async function hydrateExport(root: HTMLElement): Promise<ExportHydration> {
	const mounted: Record<string, unknown>[] = [];
	const objectUrls: string[] = [];

	root.querySelectorAll<HTMLElement>('.ex-tag').forEach((el) => {
		mounted.push(
			mount(TagChip, { target: el, props: { tag: el.dataset.tag ?? '', navigate: false } })
		);
	});
	root.querySelectorAll<HTMLElement>('.ex-checkbox').forEach((el) => {
		mounted.push(
			mount(Checkbox, {
				target: el,
				props: { checked: el.dataset.checked === 'true', onToggle: () => {} }
			})
		);
	});
	root.querySelectorAll<HTMLElement>('.ex-signal-header').forEach((el) => {
		mounted.push(
			mount(SignalHeader, { target: el, props: { type: el.dataset.signal as SignalType } })
		);
	});

	// The whole viewer, not just its OgCard: its wrapper is the card's chrome
	// (width, padding, border, leading), and reusing it is the only way the export
	// cannot drift from the editor. Its hover controls are `opacity-0` until the
	// pointer is over them, so they never reach the raster; the callbacks they
	// would fire are inert here.
	const cards = Array.from(root.querySelectorAll<HTMLElement>('.ex-embed'));
	cards.forEach((el) => {
		mounted.push(
			mount(EmbedLinkViewer, {
				target: el,
				props: {
					raw: el.dataset.url ?? '',
					alt: el.dataset.label ?? '',
					onAltChange: () => {},
					onToggleEmbed: () => {},
					onDelete: () => {}
				}
			})
		);
	});

	// Each card fetches its own metadata; the service hands out one cached promise
	// per URL, so awaiting it here is awaiting what the cards are waiting for. A
	// card whose fetch fails keeps its URL fallback and is left alone.
	await Promise.all(
		cards.map((el) => linkPreviewService.preview(el.dataset.url ?? '').catch(() => null))
	);
	await tick();

	// After the cards have rendered, so their favicons and thumbnails are included.
	await Promise.all(
		Array.from(root.querySelectorAll('img')).map((img) => inlineImage(img, objectUrls))
	);

	// Let the browser settle the final layout before anything measures it.
	await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

	return {
		dispose() {
			mounted.forEach((component) => void unmount(component));
			objectUrls.forEach((url) => URL.revokeObjectURL(url));
		}
	};
}
