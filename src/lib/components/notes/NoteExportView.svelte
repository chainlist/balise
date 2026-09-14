<script lang="ts">
	import { HEADING_METRICS } from '$lib/utils/cm/theme';
	import { renderExportHtml } from './export-markdown';
	import { hydrateExport, type ExportHydration } from './export-hydrate';

	// The document an export is rasterised from. Rendered offscreen at a fixed
	// width so the output does not depend on the window size, and styled after the
	// editor theme so the exported image shows the note the way it is written
	// rather than a second, plainer reading of the same markdown.

	let { content, title }: { content: string; title: string } = $props();

	/** Page width in CSS pixels. Roughly A4 at 96dpi, so the A4-wide PDF page the
	 *  domain builds is a 1:1 match rather than a rescale. */
	const PAGE_WIDTH = 794;

	/** Heading metrics are read from the editor theme instead of copied into the
	 *  stylesheet below, where they could drift from how the editor renders. */
	const headingVars = ([1, 2, 3, 4] as const)
		.map((level) => {
			const { fontSize, fontWeight, lineHeight } = HEADING_METRICS[level];
			return `--ex-h${level}-size:${fontSize};--ex-h${level}-weight:${fontWeight};--ex-h${level}-line:${lineHeight}`;
		})
		.join(';');

	const html = $derived(renderExportHtml(content));

	let container = $state<HTMLDivElement | null>(null);
	let hydration: ExportHydration | null = null;

	export function getNode(): HTMLElement | null {
		return container;
	}

	/**
	 * Fill in every placeholder and image, then wait for the browser to lay the
	 * result out. The rasteriser draws whatever is laid out at that moment, so an
	 * image still loading would be missing from the export.
	 */
	export async function whenReady(): Promise<void> {
		if (!container) return;
		hydration?.dispose();
		hydration = await hydrateExport(container);
	}

	$effect(() => {
		return () => {
			hydration?.dispose();
			hydration = null;
		};
	});
</script>

<!-- Offscreen but laid out: html-to-image draws what the layout engine computed,
     so this cannot be `display: none` or zero-sized. -->
<div class="pointer-events-none fixed top-0 -left-[10000px] z-[-1]" aria-hidden="true">
	<div bind:this={container} class="note-export" style="width: {PAGE_WIDTH}px; {headingVars}">
		{#if title}
			<h1 class="export-title">{title}</h1>
		{/if}
		<!-- Trusted local note markdown, the same source the editor renders. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	</div>
</div>

<style>
	/* Every rule below mirrors the editor theme (utils/cm/theme.ts): same colors,
	   same variables, same metrics, so a note exports as it is written. Block
	   spacing is the one deliberate difference: the editor lays out one line per
	   source line, while markdown here collapses blank lines into block margins,
	   so blocks are separated by exactly one editor line (--ex-gap). */
	.note-export {
		--ex-gap: calc(var(--editor-line-height, 1.75) * 1em);
		box-sizing: border-box;
		padding: 48px;
		background: var(--background);
		color: var(--editor-text-color, var(--foreground));
		font-family: var(--editor-font-family, var(--font-sans));
		font-size: var(--editor-font-size, 16px);
		line-height: var(--editor-line-height, 1.75);
	}

	/* The note title, which the app shows in its header rather than in the note
	   body: a document heading, not a markdown one. */
	.export-title {
		margin: 0 0 24px;
		font-size: 28px;
		font-weight: 700;
		line-height: 1.25;
	}

	.note-export :global(p) {
		margin: 0 0 var(--ex-gap);
	}

	.note-export :global(.ex-h) {
		margin: 0 0 0.25em;
	}
	.note-export :global(.ex-h1) {
		padding-top: 0.75em;
		font-size: var(--ex-h1-size);
		font-weight: var(--ex-h1-weight);
		line-height: var(--ex-h1-line);
		color: var(--editor-h1-color, var(--primary));
		text-decoration: var(--editor-h1-underline, none);
	}
	.note-export :global(.ex-h2) {
		padding-top: 0.5em;
		font-size: var(--ex-h2-size);
		font-weight: var(--ex-h2-weight);
		line-height: var(--ex-h2-line);
		color: var(--editor-h2-color, var(--primary));
		text-decoration: var(--editor-h2-underline, none);
	}
	.note-export :global(.ex-h3) {
		padding-top: 0.35em;
		font-size: var(--ex-h3-size);
		font-weight: var(--ex-h3-weight);
		line-height: var(--ex-h3-line);
		color: var(--editor-h3-color, var(--primary));
		text-decoration: var(--editor-h3-underline, none);
	}
	.note-export :global(.ex-h4) {
		padding-top: 0.3em;
		font-size: var(--ex-h4-size);
		font-weight: var(--ex-h4-weight);
		line-height: var(--ex-h4-line);
		color: var(--editor-h4-color, var(--primary));
		text-decoration: var(--editor-h4-underline, none);
	}

	/* Editor list marks are accent-colored; a task item carries a checkbox
	   instead of a marker. */
	.note-export :global(ul),
	.note-export :global(ol) {
		margin: 0 0 var(--ex-gap);
		padding-left: 1.5em;
	}
	.note-export :global(ul) {
		list-style: disc;
	}
	.note-export :global(ol) {
		list-style: decimal;
	}
	.note-export :global(li::marker) {
		color: var(--primary);
	}
	.note-export :global(li.ex-task) {
		list-style: none;
	}
	.note-export :global(li > ul),
	.note-export :global(li > ol) {
		margin-bottom: 0;
	}
	.note-export :global(li p) {
		margin: 0;
	}

	.note-export :global(blockquote) {
		margin: 0 0 var(--ex-gap);
		padding-left: 0.75rem;
		border-left: 3px solid color-mix(in oklch, var(--primary) 45%, transparent);
		color: var(--muted-foreground);
	}

	/* Signals (GitHub-style alerts). --signal-color is set per type and read by
	   both the block chrome and the mounted SignalHeader. */
	.note-export :global(.ex-signal) {
		margin: 0 0 var(--ex-gap);
		padding: 0.2em 0.75rem 0.4em;
		border-left: 3px solid var(--signal-color);
		border-radius: 6px;
		background: color-mix(in oklch, var(--signal-color) 12%, transparent);
	}
	.note-export :global(.ex-signal-note) {
		--signal-color: var(--signal-note);
	}
	.note-export :global(.ex-signal-tip) {
		--signal-color: var(--signal-tip);
	}
	.note-export :global(.ex-signal-important) {
		--signal-color: var(--signal-important);
	}
	.note-export :global(.ex-signal-warning) {
		--signal-color: var(--signal-warning);
	}
	.note-export :global(.ex-signal-caution) {
		--signal-color: var(--signal-caution);
	}
	.note-export :global(.ex-signal-body > :last-child) {
		margin-bottom: 0;
	}

	.note-export :global(strong) {
		font-weight: 600;
	}
	.note-export :global(em) {
		font-style: italic;
		color: var(--primary);
	}
	/* An explicit text color wins over the italic accent. */
	.note-export :global(span[style] em) {
		color: inherit;
	}
	.note-export :global(del) {
		text-decoration: line-through;
		opacity: 0.7;
	}
	.note-export :global(mark) {
		border-radius: 2px;
		background: var(--md-highlight-bg);
		color: inherit;
	}
	.note-export :global(a) {
		color: var(--primary);
		text-decoration: underline;
		text-decoration-color: var(--md-link-decoration);
	}

	.note-export :global(code) {
		padding: 1px 3px;
		border-radius: 3px;
		background: var(--md-code-bg);
		font-family: var(--md-font-mono);
		font-size: 0.875em;
	}
	.note-export :global(.ex-code) {
		position: relative;
		margin: 0 0 var(--ex-gap);
		padding: 0.75rem;
		border-radius: 6px;
		background: var(--md-code-block-bg);
		font-family: var(--md-font-mono);
		font-size: 14px;
		line-height: 1.5;
		overflow-x: auto;
	}
	.note-export :global(.ex-code[data-lang])::after {
		content: attr(data-lang);
		position: absolute;
		top: 0.25rem;
		right: 0.4rem;
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
		background: color-mix(in oklch, var(--muted-foreground) 14%, transparent);
		color: var(--muted-foreground);
		font-size: 0.7rem;
		line-height: 1.4;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.note-export :global(.ex-code code) {
		padding: 0;
		border-radius: 0;
		background: none;
		font-size: inherit;
	}

	.note-export :global(hr) {
		margin: 2em 0;
		border: 0;
		height: 1px;
		background: var(--outline-variant);
	}

	/* Separated borders (not collapsed) so the outer radius is honored; inner grid
	   lines come from per-cell top/left borders. */
	.note-export :global(table) {
		margin: 0 0 var(--ex-gap);
		border: 1px solid var(--outline-variant);
		border-collapse: separate;
		border-spacing: 0;
		border-radius: 6px;
		overflow: hidden;
		width: 100%;
		font-size: 0.9em;
		line-height: 1.5;
	}
	.note-export :global(th),
	.note-export :global(td) {
		padding: 6px 13px;
		border-top: 1px solid var(--outline-variant);
		border-left: 1px solid var(--outline-variant);
		text-align: left;
	}
	.note-export :global(thead tr:first-child th) {
		border-top: none;
	}
	.note-export :global(th:first-child),
	.note-export :global(td:first-child) {
		border-left: none;
	}
	.note-export :global(th) {
		background: color-mix(in oklch, var(--primary-500) 8%, transparent);
		font-weight: 600;
	}

	/* Embeds: a centered image, or the link card the editor shows for a URL that
	   is not an image. The card carries no style of its own here — the mounted
	   EmbedLinkViewer brings the editor's chrome with it, and this is only the
	   block box it sits in. */
	.note-export :global(.ex-image) {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 0.5em auto;
		border-radius: 4px;
	}
	.note-export :global(.ex-embed) {
		display: block;
	}
</style>
