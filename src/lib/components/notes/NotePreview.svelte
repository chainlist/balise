<script lang="ts">
	import {
		marked,
		type MarkedExtension,
		type TokenizerAndRendererExtension,
		type Tokens
	} from 'marked';
	import { assetsService } from '$lib/core/services/assets';
	import { HIGHLIGHT_SOURCE } from '$lib/utils/markdown-patterns';

	let { content }: { content: string } = $props();

	// =text= highlight extension — anchored variant of the shared CM highlight pattern
	const HIGHLIGHT_TOKEN_RE = new RegExp(`^${HIGHLIGHT_SOURCE}`);
	const highlightToken: TokenizerAndRendererExtension = {
		name: 'highlight',
		level: 'inline',
		start: (src: string) => src.indexOf('='),
		tokenizer(src: string) {
			const match = HIGHLIGHT_TOKEN_RE.exec(src);
			if (match) return { type: 'highlight', raw: match[0], text: match[1] };
		},
		renderer(token: Tokens.Generic) {
			return `<mark>${token.text}</mark>`;
		}
	};

	const highlightExtension: MarkedExtension = { extensions: [highlightToken] };

	const renderer = new marked.Renderer();
	renderer.image = ({ href, text }: Tokens.Image) => {
		if (!href) return '';
		return `<div class="grid place-content-center"><img data-path="${href}" alt="${text ?? ''}" class="my-1 max-h-24 max-w-full rounded" /></div>`;
	};

	marked.use(highlightExtension);

	const html = $derived(marked(content, { renderer, breaks: true, async: false }) as string);

	let container = $state<HTMLDivElement | null>(null);

	// Cache resolved blob URLs by path so re-renders (e.g. on content edits)
	// reuse the same URL synchronously instead of re-reading the file and
	// swapping in a fresh blob, which makes the image blink.
	const urlCache = new Map<string, string>();

	$effect(() => {
		if (!container || !html) return;

		const imgs = container.querySelectorAll<HTMLImageElement>('img[data-path]');

		imgs.forEach(async (img) => {
			const path = img.dataset.path!;
			if (path.startsWith('http://') || path.startsWith('https://')) {
				img.src = path;
				return;
			}
			const cached = urlCache.get(path);
			if (cached) {
				img.src = cached;
				return;
			}
			try {
				const data = await assetsService.readImage(path);
				const url = URL.createObjectURL(new Blob([data]));
				urlCache.set(path, url);
				img.src = url;
			} catch {
				img.style.display = 'none';
			}
		});
	});

	$effect(() => {
		return () => {
			urlCache.forEach((u) => URL.revokeObjectURL(u));
			urlCache.clear();
		};
	});
</script>

<div bind:this={container} class="note-preview line-clamp-3">
	{@html html}
</div>

<style>
	.note-preview {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		line-height: 1.6;
		color: var(--muted-foreground);
		/* Protective layer: clicks pass through to the note-card button
		   instead of hitting rendered elements like links. */
		pointer-events: none;
	}

	/* Flatten block elements to flow inline across clamped lines */
	.note-preview :global(p),
	.note-preview :global(h1),
	.note-preview :global(h2),
	.note-preview :global(h3),
	.note-preview :global(h4),
	.note-preview :global(blockquote),
	.note-preview :global(pre),
	.note-preview :global(ul),
	.note-preview :global(ol) {
		display: inline;
		margin: 0;
		padding: 0;
	}

	.note-preview :global(li) {
		display: inline;
	}
	.note-preview :global(li + li)::before {
		content: ' · ';
		opacity: 0.5;
	}

	/* Match cm-md-bold */
	.note-preview :global(strong) {
		font-weight: 600;
	}

	/* Match cm-md-italic */
	.note-preview :global(em) {
		font-style: italic;
		color: var(--primary);
	}

	/* Match cm-md-strike */
	.note-preview :global(del) {
		text-decoration: line-through;
		opacity: 0.7;
	}

	/* Match cm-md-code */
	.note-preview :global(code) {
		font-family: var(--md-font-mono);
		font-size: 0.875em;
		background: var(--md-code-bg);
		border-radius: 3px;
		padding: 1px 3px;
	}

	/* Match cm-md-link */
	.note-preview :global(a) {
		color: var(--primary);
		text-decoration: underline;
		text-decoration-color: var(--md-link-decoration);
	}

	/* Match cm-md-highlight */
	.note-preview :global(mark) {
		background: var(--md-highlight-bg);
		border-radius: 2px;
		color: inherit;
	}

	/* Render line breaks as a subtle separator instead of a full break */
	.note-preview :global(br) {
		content: ' ';
		display: inline;
	}
	.note-preview :global(br)::after {
		content: ' · ';
		opacity: 0.4;
	}

	.note-preview :global(hr),
	.note-preview :global(table) {
		display: none;
	}
</style>
