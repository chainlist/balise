<script lang="ts">
	import { marked, type Tokens } from 'marked';
	import { assetsService } from '$lib/services/assets';
	import { highlightExtension } from '$lib/utils/markdown-render';

	// The document an export is rasterised from. Rendered offscreen at a fixed
	// width so the output does not depend on the window size, and laid out as a
	// page rather than as the editor — an exported PDF should read like a
	// document, not like a screenshot of an app.

	let { content, title }: { content: string; title: string } = $props();

	/** Page width in CSS pixels. Roughly A4 at 96dpi, so the A4-wide PDF page the
	 *  domain builds is a 1:1 match rather than a rescale. */
	const PAGE_WIDTH = 794;

	marked.use(highlightExtension);

	const renderer = new marked.Renderer();
	renderer.image = ({ href, text }: Tokens.Image) => {
		if (!href) return '';
		return `<img data-path="${href}" alt="${text ?? ''}" />`;
	};

	const html = $derived(marked(content, { renderer, breaks: true, async: false }) as string);

	let container = $state<HTMLDivElement | null>(null);
	const objectUrls: string[] = [];

	export function getNode(): HTMLElement | null {
		return container;
	}

	/**
	 * Resolve every desk-relative image to a blob URL and wait for the browser to
	 * decode it. The rasteriser draws whatever is laid out at that moment, so an
	 * image still loading would be missing from the export.
	 */
	export async function whenReady(): Promise<void> {
		if (!container) return;
		const images = Array.from(container.querySelectorAll<HTMLImageElement>('img[data-path]'));

		await Promise.all(
			images.map(async (img) => {
				const path = img.dataset.path!;
				if (path.startsWith('http://') || path.startsWith('https://')) {
					img.src = path;
				} else {
					try {
						const data = await assetsService.readImage(path);
						const url = URL.createObjectURL(new Blob([data as BlobPart]));
						objectUrls.push(url);
						img.src = url;
					} catch {
						// An image the desk no longer holds should not block the export.
						img.remove();
						return;
					}
				}
				try {
					await img.decode();
				} catch {
					// A broken source is dropped rather than exported as a placeholder.
					img.remove();
				}
			})
		);

		// Let the browser settle the final layout before anything measures it.
		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
	}

	$effect(() => {
		return () => {
			objectUrls.forEach((u) => URL.revokeObjectURL(u));
			objectUrls.length = 0;
		};
	});
</script>

<!-- Offscreen but laid out: html-to-image draws what the layout engine computed,
     so this cannot be `display: none` or zero-sized. -->
<div class="pointer-events-none fixed top-0 -left-[10000px] z-[-1]" aria-hidden="true">
	<div bind:this={container} class="note-export" style="width: {PAGE_WIDTH}px">
		{#if title}
			<h1 class="export-title">{title}</h1>
		{/if}
		<!-- Trusted local note markdown, the same source NotePreview renders. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	</div>
</div>

<style>
	.note-export {
		box-sizing: border-box;
		padding: 48px;
		background: var(--background);
		color: var(--foreground);
		font-family: var(--font-sans);
		font-size: 15px;
		line-height: 1.7;
	}

	.export-title {
		margin: 0 0 24px;
		font-size: 28px;
		font-weight: 700;
		line-height: 1.25;
	}

	.note-export :global(h1),
	.note-export :global(h2),
	.note-export :global(h3),
	.note-export :global(h4) {
		margin: 1.4em 0 0.5em;
		font-weight: 650;
		line-height: 1.3;
	}
	.note-export :global(h1) {
		font-size: 1.7em;
	}
	.note-export :global(h2) {
		font-size: 1.4em;
	}
	.note-export :global(h3) {
		font-size: 1.2em;
	}
	.note-export :global(h4) {
		font-size: 1.05em;
	}

	.note-export :global(p),
	.note-export :global(ul),
	.note-export :global(ol),
	.note-export :global(blockquote),
	.note-export :global(pre),
	.note-export :global(table) {
		margin: 0 0 1em;
	}

	.note-export :global(ul),
	.note-export :global(ol) {
		padding-left: 1.5em;
	}
	.note-export :global(li) {
		margin: 0.2em 0;
	}

	.note-export :global(blockquote) {
		padding-left: 1em;
		border-left: 3px solid var(--primary);
		color: var(--muted-foreground);
	}

	.note-export :global(strong) {
		font-weight: 650;
	}
	.note-export :global(em) {
		font-style: italic;
		color: var(--primary);
	}
	.note-export :global(del) {
		text-decoration: line-through;
		opacity: 0.7;
	}

	.note-export :global(code) {
		padding: 1px 4px;
		border-radius: 3px;
		background: var(--md-code-bg);
		font-family: var(--md-font-mono);
		font-size: 0.875em;
	}
	.note-export :global(pre) {
		padding: 12px 14px;
		border-radius: 6px;
		background: var(--md-code-bg);
		overflow-x: auto;
	}
	.note-export :global(pre code) {
		padding: 0;
		background: none;
	}

	.note-export :global(a) {
		color: var(--primary);
		text-decoration: underline;
		text-decoration-color: var(--md-link-decoration);
	}

	.note-export :global(mark) {
		padding: 0 2px;
		border-radius: 2px;
		background: var(--md-highlight-bg);
		color: inherit;
	}

	.note-export :global(img) {
		max-width: 100%;
		height: auto;
		margin: 0.5em 0;
		border-radius: 4px;
	}

	.note-export :global(hr) {
		margin: 1.5em 0;
		border: 0;
		border-top: 1px solid var(--border);
	}

	.note-export :global(table) {
		width: 100%;
		border-collapse: collapse;
	}
	.note-export :global(th),
	.note-export :global(td) {
		padding: 6px 10px;
		border: 1px solid var(--border);
		text-align: left;
	}
	.note-export :global(th) {
		background: var(--muted);
		font-weight: 600;
	}
</style>
