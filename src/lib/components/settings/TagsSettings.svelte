<script lang="ts">
	import { PinIcon } from '@lucide/svelte';
	import { tagsService } from '$lib/core/services/tags.svelte';
	import type { Tag } from '$lib/core/domain/tag';
	import TagName from '$lib/components/TagName.svelte';
	import TagSettingsSheet from '$lib/components/sidebar/TagSettingsSheet.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import * as m from '$paraglide/messages.js';

	const tags = $derived(tagsService.tags);

	let isEditOpen = $state(false);
	let editingTag = $state<Tag | null>(null);

	function openEdit(tag: Tag) {
		editingTag = tag;
		isEditOpen = true;
	}
</script>

<SettingsSection
	title={m.settings_tags_heading()}
	description={m.settings_tags_description()}
	bodyClass={null}
>
	<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-6">
		{#if tags.length === 0}
			<p class="text-sm text-muted-foreground">{m.settings_tags_empty()}</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each tags as tag (tag.tag)}
					<button
						type="button"
						onclick={() => openEdit(tag)}
						class="group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
					>
						<span class="min-w-0 flex-1">
							<TagName {tag} />
						</span>
						{#if tag.display_name}
							<span class="shrink-0 font-mono text-xs text-muted-foreground">#{tag.tag}</span>
						{/if}
						{#if tag.pinned}
							<PinIcon size="14" class="shrink-0 fill-primary stroke-primary" />
						{/if}
						<span class="w-8 shrink-0 text-right text-xs text-muted-foreground">{tag.count}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</SettingsSection>

<TagSettingsSheet bind:open={isEditOpen} tag={editingTag} />
