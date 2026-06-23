<script lang="ts">
	import { onMount } from 'svelte';
	import { linkPreviewService, type LinkPreview } from '$lib/services/link-preview';

	// Shared Open Graph card content (favicon, title, description, thumbnail).
	// Self-fetches via the cached linkPreviewService; the consumer supplies the
	// outer chrome (block button vs hover popover). url = the link, label = the
	// link text shown before metadata loads.
	let { url, label = '' }: { url: string; label?: string } = $props();

	let preview = $state<LinkPreview | null>(null);
	let failed = $state(false);

	const domain = $derived.by(() => {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	});

	function hideOnError(event: Event) {
		if (event.currentTarget instanceof HTMLElement) event.currentTarget.style.display = 'none';
	}

	onMount(() => {
		linkPreviewService
			.preview(url)
			.then((p) => (preview = p))
			.catch(() => (failed = true));
	});
</script>

<div class="flex gap-3">
	<div class="min-w-0 flex-1">
		<div class="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
			{#if preview?.favicon}
				<img src={preview.favicon} alt="" class="size-4 rounded-sm" onerror={hideOnError} />
			{/if}
			<span class="truncate">{domain}</span>
		</div>
		<div class="truncate font-medium text-foreground">
			{preview?.title || label || domain}
		</div>
		{#if preview?.description}
			<div class="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{preview.description}</div>
		{:else if failed}
			<div class="mt-0.5 truncate text-sm text-muted-foreground">{url}</div>
		{/if}
	</div>
	{#if preview?.image}
		<img
			src={preview.image}
			alt=""
			class="size-20 shrink-0 rounded-md object-cover"
			onerror={hideOnError}
		/>
	{/if}
</div>
