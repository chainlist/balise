<script lang="ts">
	import { tagState, tagDisplayName } from '$lib/services/tags.svelte';

	type TagLike = { tag: string; display_name: string | null };

	let { tag }: { tag: string | TagLike } = $props();

	const tagObj = $derived(
		typeof tag === 'string'
			? (tagState.tags.find((t) => t.tag.toLowerCase() === tag.toLowerCase()) ?? {
					tag,
					display_name: null
				})
			: tag
	);
</script>

{tagDisplayName(tagObj)}
