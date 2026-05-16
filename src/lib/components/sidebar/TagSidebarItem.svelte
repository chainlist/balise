<script lang="ts">
	import { setActiveTag, uiState } from '$lib/services/ui-state.svelte';
	import { tagDisplayName, type Tag } from '$lib/services/tags.svelte';
	import { Settings2Icon } from '@lucide/svelte';
	import { Button } from '../shadcn/button';

	let { tag, onSettings }: { tag: Tag; onSettings: (tag: Tag) => void } = $props();

	let isActive = $derived(uiState.activeTag === tag.tag);

	function handleSettingsClick(e: MouseEvent) {
		e.stopPropagation();
		onSettings(tag);
	}
</script>

<button
	class:active={isActive}
	onclick={() => setActiveTag(tag.tag)}
	class="group inline-flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-primary/10"
>
	<div class="flex items-center gap-2">
		<span
			class="size-2 shrink-0 rounded-full bg-accent-foreground/30"
			style={tag.color ? `background: ${tag.color};` : ''}
		></span>
		<span>{tagDisplayName(tag)}</span>
	</div>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="flex gap-2" onclick={handleSettingsClick}>
		<span class="ml-auto text-xs text-muted-foreground group-hover:hidden">{tag.count}</span>
		<div aria-label="Tag settings" class="hidden group-hover:inline-block">
			<Settings2Icon size="16" />
		</div>
	</div>
</button>

<style>
	@reference '../../../routes/layout.css';

	.active {
		@apply bg-primary/20;
	}
</style>
