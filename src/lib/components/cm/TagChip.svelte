<script lang="ts">
	import { tagsService } from '$lib/services/tags.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';

	let { tag, navigate = false }: { tag: string; navigate: boolean } = $props();

	let tagData = $derived(tagsService.tags.find((t) => t.tag.toLowerCase() === tag.toLowerCase()));
	let label = $derived(tagData?.display_name ?? tagData?.tag ?? tag);
	let color = $derived(tagData?.color ?? null);

	const isActive = $derived(uiState.activeTag === (tagData?.tag ?? tag));

	function nav() {
		if (navigate) {
			uiState.setActiveTag(tagData?.tag ?? tag);
		}
	}
</script>

<svelte:element
	this={navigate ? 'button' : 'span'}
	{...navigate ? { type: 'button' } : {}}
	class="inline-block rounded border px-1.5 align-baseline leading-tight text-foreground select-none"
	class:cursor-pointer={navigate}
	class:cursor-default={!navigate}
	style={isActive ? `border-color: var(--primary);` : undefined}
	onclick={navigate ? nav : undefined}
>
	<span
		class={[
			'mr-1 inline-block size-2 rounded-full align-middle',
			!color && 'bg-sidebar-foreground/30'
		]}
		style={color ? `background-color: ${color};` : undefined}
	></span>{label}
</svelte:element>
