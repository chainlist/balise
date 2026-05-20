<script lang="ts">
	import { setActiveTag, uiState } from '$lib/services/ui-state.svelte';
	import { tagDisplayName, type Tag } from '$lib/services/tags.svelte';
	import { Settings2Icon, PinIcon } from '@lucide/svelte';
	import { UNTAGGED_FILTER } from '$lib/services/notes.svelte';
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { cn } from '$lib/utils.js';

	let { tag, onSettings }: { tag: Tag; onSettings?: (tag: Tag) => void } = $props();

	let isActive = $derived(uiState.activeTag === tag.tag);

	function handleSettingsClick(e: Event) {
		e.stopPropagation();
		onSettings?.(tag);
	}
</script>

<Sidebar.MenuButton
	isActive={isActive}
	onclick={() => setActiveTag(tag.tag)}
	class="inline-flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-primary/10 select-none "
>
	<div class={cn(onSettings ? 'group/tag-item' : '', "flex items-center gap-2 justify-between w-full")}>
		<div class="flex items-center gap-2 ">
			{#if tag.pinned}
				<PinIcon
					size="14"
					style="color: {tag.color ?? 'currentColor'};"
					class="shrink-0 text-muted-foreground/50"
				/>
			{:else if tag.tag === UNTAGGED_FILTER}
				<span class="size-2 shrink-0 rounded-full border border-dashed border-muted-foreground"
				></span>
			{:else if tag.color}
				<span class="text-sm text-muted-foreground/50" style="color: {tag.color};">#</span>
			{:else}
				<span class="text-sm text-muted-foreground/50">#</span>
			{/if}
			<span>{tagDisplayName(tag)}</span>
		</div>
		<div
			role="button"
			tabindex="0"
			aria-label="Open tag settings"
			class="flex gap-2"
			onclick={handleSettingsClick}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSettingsClick(e); } }}
		>
			<span class="ml-auto text-xs text-muted-foreground group-hover/tag-item:hidden">{tag.count}</span>
			{#if onSettings}
				<div class="hidden group-hover/tag-item:inline-block">
					<Settings2Icon size="16" />
				</div>
			{/if}
		</div>
	</div>
</Sidebar.MenuButton>

<style>
	@reference '../../../routes/layout.css';

	.active {
		@apply bg-primary/50;
	}
</style>
