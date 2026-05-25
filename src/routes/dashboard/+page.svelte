<script lang="ts">
	import { onMount } from 'svelte';
	import { tagsService, tagDisplayName, type Tag } from '$lib/services/tags.svelte';
	import { getDB } from '$lib/utils/db';
	import { queryTotalNotesCount } from '$lib/repositories/notes.repo';
	import { FileTextIcon, HashIcon, MergeIcon, TrendingUpIcon, ArrowRightIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import TagChip from '$lib/components/cm/TagChip.svelte';
	import * as m from '$paraglide/messages.js';

	let totalNotes = $state(0);

	const totalTags = $derived(tagsService.tags.length);
	const topTags = $derived([...tagsService.tags].sort((a, b) => b.count - a.count).slice(0, 5));
	const maxCount = $derived(topTags[0]?.count ?? 1);

	const mergeSuggestions = $derived(computeMergeSuggestions(tagsService.tags));

	function computeMergeSuggestions(tags: Tag[]): Array<{ a: Tag; b: Tag }> {
		const sorted = [...tags].sort((a, b) => a.tag.localeCompare(b.tag));
		const suggestions: Array<{ a: Tag; b: Tag }> = [];
		for (let i = 0; i < sorted.length - 1 && suggestions.length < 3; i++) {
			const a = sorted[i];
			const b = sorted[i + 1];
			const shorter = a.tag.length <= b.tag.length ? a : b;
			const longer = a.tag.length <= b.tag.length ? b : a;
			if (
				longer.tag.toLowerCase().startsWith(shorter.tag.toLowerCase()) &&
				shorter.tag.length >= 2
			) {
				suggestions.push({ a: shorter, b: longer });
			}
		}
		return suggestions;
	}

	onMount(async () => {
		totalNotes = await queryTotalNotesCount(getDB());
	});
</script>

<div class="h-full overflow-y-auto p-8">
	<div class="mx-auto max-w-3xl space-y-6">
		<div>
			<h1 class="text-2xl font-semibold text-foreground">{m.dashboard_heading()}</h1>
			<p class="mt-1 text-sm text-muted-foreground">{m.dashboard_description()}</p>
		</div>

		<!-- Stats row -->
		<div class="grid grid-cols-2 gap-4">
			<div class="rounded-lg border bg-card p-5">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-muted-foreground">{m.dashboard_total_notes()}</p>
					<FileTextIcon class="size-4 text-muted-foreground" />
				</div>
				<p class="mt-3 text-3xl font-bold text-foreground">{totalNotes}</p>
			</div>

			<div class="rounded-lg border bg-card p-5">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-muted-foreground">{m.dashboard_total_tags()}</p>
					<HashIcon class="size-4 text-muted-foreground" />
				</div>
				<p class="mt-3 text-3xl font-bold text-foreground">{totalTags}</p>
			</div>
		</div>

		<!-- Top 5 Tags -->
		<div class="rounded-lg border bg-card p-5">
			<div class="mb-4 flex items-center gap-2">
				<TrendingUpIcon class="size-4 text-muted-foreground" />
				<h2 class="text-sm font-semibold text-foreground">{m.dashboard_top_tags()}</h2>
			</div>
			{#if topTags.length === 0}
				<p class="text-sm text-muted-foreground">{m.dashboard_no_tags()}</p>
			{:else}
				<div class="space-y-3">
					{#each topTags as tag (tag.tag)}
						<div class="flex items-center gap-3">
							<span
								class="w-28 truncate text-sm font-medium"
								style="color: {tag.color ?? 'var(--primary)'}"
							>
								#{tagDisplayName(tag)}
							</span>
							<div class="flex-1">
								<div class="h-2 overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full transition-all duration-500"
										style="width: {(tag.count / maxCount) * 100}%; background: {tag.color ??
											'var(--primary)'}"
									></div>
								</div>
							</div>
							<span class="w-6 text-right text-xs tabular-nums text-muted-foreground"
								>{tag.count}</span
							>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Merge Tag Suggestions -->
		<div class="rounded-lg border bg-card p-5">
			<div class="mb-1 flex items-center gap-2">
				<MergeIcon class="size-4 text-muted-foreground" />
				<h2 class="text-sm font-semibold text-foreground">{m.dashboard_merge_title()}</h2>
			</div>
			<p class="mb-4 text-xs text-muted-foreground">
				{m.dashboard_merge_description()}
			</p>
			{#if mergeSuggestions.length === 0}
				<p class="text-sm text-muted-foreground">{m.dashboard_no_merges()}</p>
			{:else}
				<div class="space-y-2">
					{#each mergeSuggestions as { a, b } (`${a.tag}-${b.tag}`)}
						<div class="flex items-center gap-3 rounded-md border border-dashed px-4 py-3">
							<TagChip tag={a.tag} navigate={false} />
							<ArrowRightIcon class="size-3 shrink-0 text-muted-foreground" />
							<TagChip tag={b.tag} navigate={false} />
							<div class="ml-auto flex items-center gap-2">
								<span class="text-xs text-muted-foreground">{m.dashboard_merge_count({ count: a.count + b.count })}</span>
								<Button variant="outline" size="sm" disabled>{m.action_merge()}</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
