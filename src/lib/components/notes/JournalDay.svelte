<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { Note } from '$lib/models/note';
	import { notesService } from '$lib/services/content/notes.svelte';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { formatDate } from '$lib/utils/date-format';
	import { eventBus } from '$lib/services/events/event-bus';
	import { ChevronRightIcon } from '@lucide/svelte';
	import NoteEditor from './NoteEditor.svelte';
	import * as m from '$paraglide/messages.js';

	const JOURNAL_TAG = 'journal';

	let { date }: { date: Date } = $props();

	// User-facing collapse, distinct from the virtualization `visible` below. Today
	// always starts open; the setting only folds past/other days by default. `date`
	// is fixed per instance, so reading it once at init is intentional.
	let collapsed = $state(
		settingsService.journal.state.collapseByDefault && untrack(() => !isSameDay(date, new Date()))
	);

	let notes = $state<Note[]>([]);
	let draft = $state<Note | null>(null);
	// Cleared once the draft is persisted, so later edits flow through the normal update path.
	let draftSave = $state<((content: string) => Promise<void>) | undefined>(undefined);

	// Days far from the viewport drop their editor(s) so the timeline can span months
	// without keeping a CodeMirror instance alive per day. A placeholder of the last
	// rendered height keeps the scroll position and the page's sentinels steady.
	let visible = $state(true);
	let placeholderHeight = $state(0);
	// Read imperatively when the day scrolls away, so a plain ref (not $state) is enough.
	let bodyEl: HTMLElement | undefined;

	function measureBody(node: HTMLElement) {
		bodyEl = node;
		return () => (bodyEl = undefined);
	}

	// rootMargin only buys a preload buffer when it is measured against the actual
	// scroll container; with the default (viewport) root the scroller clips it away.
	function scrollParent(node: HTMLElement): HTMLElement | null {
		for (let el = node.parentElement; el; el = el.parentElement) {
			const overflowY = getComputedStyle(el).overflowY;
			if (overflowY === 'auto' || overflowY === 'scroll') return el;
		}
		return null;
	}

	function trackVisibility(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visible = true;
					} else if (bodyEl) {
						placeholderHeight = bodyEl.offsetHeight;
						visible = false;
					}
				}
			},
			{ root: scrollParent(node), rootMargin: '600px' }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}

	const label = $derived(
		formatDate(
			date,
			settingsService.general.state.dateFormat,
			settingsService.general.state.language
		)
	);
	const isToday = $derived(isSameDay(date, new Date()));

	function isSameDay(a: Date, b: Date): boolean {
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}

	function dateStr(d: Date): string {
		const y = d.getFullYear();
		const mo = String(d.getMonth() + 1).padStart(2, '0');
		const da = String(d.getDate()).padStart(2, '0');
		return `${y}-${mo}-${da}`;
	}

	function startDraft(): void {
		const id = crypto.randomUUID();
		const stamp = `${dateStr(date)} 00:00:00`;
		draftSave = async (content) => {
			await notesService.createForDate(id, content, date);
			draftSave = undefined;
			// The note now lives in the DB. Drop the in-memory seed so that if this day is
			// recycled while off-screen, it reloads the persisted content on remount.
			if (draft) draft.content = undefined;
		};
		draft = {
			id,
			content: `\n\n#${JOURNAL_TAG}`,
			title: '',
			preview: '',
			pinned: false,
			archived: false,
			created_at: stamp,
			updated_at: stamp
		};
	}

	onMount(() => {
		void notesService.queryForDate(date).then((res) => (notes = res));
		// Drop a note that gets deleted elsewhere, reverting the day to its empty state.
		return eventBus.notes.deleted.on((id) => {
			notes = notes.filter((n) => n.id !== id);
			if (draft?.id === id) {
				draft = null;
				draftSave = undefined;
			}
		});
	});
</script>

<section {@attach trackVisibility} class="border-b border-primary/10 pb-8">
	<div class="mx-auto w-full max-w-175 px-2">
		<button
			type="button"
			onclick={() => (collapsed = !collapsed)}
			aria-expanded={!collapsed}
			class="flex w-full items-center gap-1.5 pl-4 text-left"
		>
			<ChevronRightIcon
				class="size-4 shrink-0 text-muted-foreground transition-transform {collapsed
					? ''
					: 'rotate-90'}"
			/>
			<h2
				class="py-3 text-xl font-semibold tracking-wide capitalize"
				class:text-primary={isToday}
				class:text-muted-foreground={!isToday}
			>
				{label}
			</h2>
		</button>
	</div>

	{#if collapsed}
		<!-- Folded: render only the header. -->
	{:else if visible}
		<div {@attach measureBody}>
			{#if notes.length}
				{#each notes as note (note.id)}
					<div class="relative min-h-min">
						<NoteEditor {note} floating={false} autofocus={false} showHeader={false} />
					</div>
				{/each}
			{:else if draft}
				<div class="relative min-h-min">
					<!-- Autofocus only the fresh draft; once saved it can be recycled by
					     virtualization, and refocusing on remount would steal the caret. -->
					<NoteEditor
						note={draft}
						onSave={draftSave}
						floating={false}
						autofocus={!!draftSave}
						showHeader={false}
					/>
				</div>
			{:else}
				<div class="mx-auto w-full max-w-175 px-2 pl-12">
					<button
						onclick={startDraft}
						class="min-h-24 w-full rounded py-3 text-left text-sm text-muted-foreground/60 hover:text-muted-foreground"
					>
						{m.journal_empty_day()}
					</button>
				</div>
			{/if}
		</div>
	{:else}
		<div style="height: {placeholderHeight}px"></div>
	{/if}
</section>
