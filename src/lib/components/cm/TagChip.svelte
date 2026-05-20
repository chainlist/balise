<script lang="ts">
	import { tagState } from '$lib/services/tags.svelte';
	import { setActiveTag } from '$lib/services/ui-state.svelte';

	let { tag, navigate = false }: { tag: string; navigate: boolean } = $props();

	let tagData = $derived(tagState.tags.find((t) => t.tag.toLowerCase() === tag.toLowerCase()));
	let label = $derived(tagData?.display_name ?? tagData?.tag ?? tag);
	let color = $derived(tagData?.color ?? null);

	function nav() {
		if (navigate) {
			setActiveTag(tagData?.tag ?? tag);
		}
	}
</script>

<svelte:element
	this={navigate ? 'button' : 'span'}
	{...(navigate ? { type: 'button' } : {})}
	class="rounded-full px-1.5 select-none"
	class:cursor-pointer={navigate}
	class:cursor-default={!navigate}
	style="color: {color ?? 'var(--primary)'}; background: color-mix(in oklch, {color ??
		'var(--primary)'} 12%, transparent);"
	onclick={navigate ? nav : undefined}
>
	#{label}
</svelte:element>
