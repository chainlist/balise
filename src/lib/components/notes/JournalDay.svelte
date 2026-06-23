<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { NoteListItem } from '$lib/core/domain/note';
	import { journalService } from '$lib/core/services/journal.svelte';
	import { settingsService } from '$lib/core/services/settings/settings.svelte';
	import { uiState } from '$lib/core/services/ui-state.svelte';
	import { formatDate } from '$lib/utils/date-format';
	import { eventBus } from '$lib/core/services/events/event-bus';
	import { ChevronRightIcon, PanelLeftIcon } from '@lucide/svelte';
	import NoteEditor from './NoteEditor.svelte';
	import * as m from '$paraglide/messages.js';

	const JOURNAL_TAG = 'journal';

	let { date, hasNotes, count }: { date: Date; hasNotes: boolean; count: number } = $props();

	// User-facing collapse. Today always starts open; the setting only folds past/other
	// days by default. `date` is fixed per instance, so reading it once at init is intentional.
	let collapsed = $state(
		settingsService.journal.state.collapseByDefault && untrack(() => !isSameDay(date, new Date()))
	);

	let notes = $state<NoteListItem[]>([]);
	let draft = $state<(NoteListItem & { content?: string }) | null>(null);
	// Cleared once the draft is persisted, so later edits flow through the normal update path.
	let draftSave = $state<((content: string) => Promise<void>) | undefined>(undefined);

	const label = $derived(
		formatDate(
			date,
			settingsService.general.state.dateFormat,
			settingsService.general.state.language
		)
	);
	const isToday = $derived(isSameDay(date, new Date()));
	const isActiveDay = $derived(!!uiState.activeDay && isSameDay(uiState.activeDay, date));

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
			await journalService.createForDate(id, content, date);
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
			createdAt: stamp,
			updatedAt: stamp
		};
	}

	onMount(() => {
		void journalService.queryForDate(date).then((res) => (notes = res));
		// Drop a note that gets deleted elsewhere, reverting the day to its empty state.
		const offDeleted = eventBus.notes.deleted.on((id) => {
			notes = notes.filter((n) => n.id !== id);
			if (draft?.id === id) {
				draft = null;
				draftSave = undefined;
			}
		});
		// A "go to date" jump expands the matching day even if it was collapsed.
		const offJumped = eventBus.journal.jumpedTo.on((key) => {
			if (key === dateStr(date)) collapsed = false;
		});
		return () => {
			offDeleted();
			offJumped();
		};
	});
</script>

<section
	class="group border-b border-primary/10 pb-4"
	class:border-l-2={isToday}
	class:border-l-primary={isToday}
>
	<div class="mx-auto flex w-full max-w-175 items-center justify-between px-2">
		<button
			type="button"
			onclick={() => (collapsed = !collapsed)}
			aria-expanded={!collapsed}
			class="flex min-w-0 flex-1 items-center gap-1.5 pl-4 text-left"
		>
			<ChevronRightIcon
				class="size-4 shrink-0 text-muted-foreground transition-transform {collapsed
					? ''
					: 'rotate-90'}"
			/>
			<!-- Editor h3 size/weight (.cm-md-h3 in cm/theme.ts): 1.25em, weight 600, in var(--primary). -->
			<h2 class="py-3 text-[1.25em] leading-[1.4] font-semibold text-[var(--primary)] capitalize">
				{label}
			</h2>
			{#if hasNotes && collapsed}
				<!-- Mirrors the CodeMirror fold placeholder (.cm-foldPlaceholder in cm/theme.ts). -->
				<span
					class="shrink-0 rounded bg-[var(--primary)]/10 px-1.5 text-[0.85em] text-[var(--primary)]"
					aria-hidden="true">...</span
				>
			{/if}
		</button>
		{#if count > 0}
			<button
				type="button"
				onclick={() => uiState.setActiveDay(date)}
				aria-label={m.journal_view_day_notes()}
				title={m.journal_view_day_notes()}
				class="mr-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8em] font-medium transition-opacity focus-visible:opacity-100 group-hover:opacity-100 {isActiveDay
					? 'border-primary/40 bg-[var(--primary)]/10 text-[var(--primary)] opacity-100'
					: 'border-primary/15 text-muted-foreground opacity-0 hover:bg-sidebar-accent hover:text-on-surface'}"
			>
				<PanelLeftIcon class="size-3.5 shrink-0" />
				{m.journal_day_notes_count({ count })}
			</button>
		{/if}
	</div>

	{#if !collapsed}
		<div>
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
	{/if}
</section>
