<script lang="ts">
	import * as m from '$paraglide/messages.js';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import type { TagOccurrences } from '$lib/utils/tag-parser';
	import TagNavigator from './TagNavigator.svelte';

	let {
		readingTime,
		date,
		tags,
		onNavigate
	}: {
		readingTime: number;
		date: Date;
		tags: TagOccurrences[];
		onNavigate: (pos: number) => void;
	} = $props();

	const intl = $derived(
		new Intl.DateTimeFormat(settingsService.general.state.language, { dateStyle: 'medium' })
	);

	// Pin the tag toolbar once the user starts navigating, then unpin when they
	// scroll back to its initial position.
	let pinned = $state(false);

	function scrollParent(el: HTMLElement): HTMLElement | null {
		for (let node = el.parentElement; node; node = node.parentElement) {
			const overflowY = getComputedStyle(node).overflowY;
			if (overflowY === 'auto' || overflowY === 'scroll') return node;
		}
		return null;
	}

	// Attached to a sentinel sitting at the toolbar's natural top: while pinned,
	// watch for that position re-entering the viewport and unpin when it does.
	function watchScrollBack(sentinel: HTMLElement) {
		if (!pinned) return;
		// Match the toolbar's sticky top offset so unpinning is seamless,
		// whatever `top-*` it uses.
		const toolbar = sentinel.nextElementSibling;
		const top = toolbar ? parseFloat(getComputedStyle(toolbar).top) || 0 : 0;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) pinned = false;
			},
			{ root: scrollParent(sentinel), rootMargin: `-${top}px 0px 0px 0px` }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}

	function navigate(pos: number) {
		pinned = true;
		onNavigate(pos);
	}
</script>

<div class="">
	<div
		class="mx-auto flex w-full max-w-175 items-center gap-2 px-10 pt-4 pb-2 font-mono text-xs text-muted-foreground select-none"
	>
		<span class="font-bold">{intl.format(date)}</span>
		<span class="font-bold">·</span>
		<span>{m.editor_reading_time({ minutes: readingTime })}</span>
	</div>
</div>

{#if tags.length}
	<!-- Sentinel marks the toolbar's natural position so we can detect the
	     scroll-back and unpin. Pinning starts on the first arrow click. -->
	<div {@attach watchScrollBack} aria-hidden="true"></div>
	<div class={pinned ? 'sticky top-2 z-10' : ''}>
		<div
			class="mx-auto flex w-full max-w-175 flex-wrap gap-1.5 px-10 py-2 {pinned
				? 'frost-surface '
				: ''}"
		>
			{#each tags as tag (tag.name)}
				<TagNavigator name={tag.name} positions={tag.positions} onNavigate={navigate} />
			{/each}
		</div>
	</div>
{/if}
