<script lang="ts">
	import { tagsService, tagDisplayName } from '$lib/services/tags.svelte';
	import type { Tag, RelatedTag } from '$lib/models/tag';

	let { tag }: { tag: string | Tag | RelatedTag } = $props();

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

<span style={tagObj.color ? `color: ${tagObj.color};` : ''}>
	{tagDisplayName(tagObj)}
</span>
