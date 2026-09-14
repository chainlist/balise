<script lang="ts">
	import { tagsService } from '$lib/services/tags.svelte';
	import { tagDisplayName, type Tag, type RelatedTag } from '$lib/domain/tag';
	import { PinIcon } from '@lucide/svelte';

	let {
		tag,
		untagged,
		pinned
	}: { tag: string | Tag | RelatedTag; untagged?: boolean; pinned?: boolean } = $props();

	const tagObj = $derived(
		typeof tag === 'string'
			? (tagsService.tags.find((t) => t.tag.toLowerCase() === tag.toLowerCase()) ?? {
					tag,
					display_name: null,
					color: null
				})
			: tag
	);
</script>

<span class="inline-flex min-w-0 items-center gap-1.5">
	{#if pinned}
		<PinIcon class="size-2.5 shrink-0 fill-current text-sidebar-foreground/50" />
	{:else if untagged}
		<span class="size-2 shrink-0 rounded-full border border-dashed border-sidebar-foreground/30"
		></span>
	{:else if tagObj.color}
		<span class="size-2 shrink-0 rounded-full" style="background-color: {tagObj.color};"></span>
	{:else}
		<span class="size-2 shrink-0 rounded-full bg-sidebar-foreground/30 text-sm"></span>
	{/if}
	<span class="truncate">{tagDisplayName(tagObj)}</span>
</span>
