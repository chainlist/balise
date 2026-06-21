<script lang="ts">
	import { Calendar, Day as CalendarDay } from '$lib/components/shadcn/calendar/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as Popover from '$lib/components/shadcn/popover';
	import { Calendar as CalendarIcon } from '@lucide/svelte';
	import { today, getLocalTimeZone, isSameDay } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';
	import { onMount, tick } from 'svelte';
	import { uiState } from '$lib/services/app/ui-state.svelte';
	import { notesService } from '$lib/services/content/notes.svelte';
	import { eventBus } from '$lib/services/events/event-bus';
	import { cn } from '$lib/utils.js';
	import JournalDay from '$lib/components/notes/JournalDay.svelte';
	import * as m from '$paraglide/messages.js';

	// Past days extend downward, future days upward. Today starts at the top.
	const PAST_INIT = 30;
	const CHUNK = 14;
	// Keep this much off-screen content rendered each side before folding it away.
	const BUFFER = 800;

	// Data window: how far the timeline has grown. Render window: the contiguous slice
	// actually in the DOM. Days between the two are folded into the spacers, which hold
	// their exact measured height so folding/unfolding never moves the scrollbar.
	let minOffset = $state(-PAST_INIT);
	let maxOffset = $state(0);
	let renderMin = $state(-PAST_INIT);
	let renderMax = $state(0);
	let topSpacer = $state(0);
	let bottomSpacer = $state(0);
	const heights = new Map<number, number>();

	let scrollerEl: HTMLElement | undefined;
	let reconciling = false;

	let calendarOpen = $state(false);
	let calendarValue = $state<DateValue>(today(getLocalTimeZone()));

	// Local days that have a note, refreshed each time the calendar opens so the
	// dot markers stay current without polling on every edit.
	let noteDates = $state<Set<string>>(new Set());

	// Local days that have a journal note, kept for the whole timeline so each day's
	// header can show its collapsed "..." marker without loading that day's notes.
	let journalDays = $state<Set<string>>(new Set());

	async function loadNoteDates(): Promise<void> {
		noteDates = await notesService.noteDates();
	}

	async function loadJournalDays(): Promise<void> {
		journalDays = await notesService.journalNoteDates();
	}

	function dateKey(d: DateValue): string {
		return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
	}

	function dayKey(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	// Top -> bottom renders future -> past, so offsets descend.
	const rendered = $derived.by(() => {
		const list: number[] = [];
		for (let o = renderMax; o >= renderMin; o--) list.push(o);
		return list;
	});

	function dayFromOffset(offset: number): Date {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
	}

	function offsetFromDate(date: Date): number {
		const now = new Date();
		const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
		const b = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
		return Math.round((b - a) / 86_400_000);
	}

	// Appending older days below needs no adjustment; prepending future days above
	// shifts everything down, so restore the scroll offset to keep the view steady.
	async function extendFuture(): Promise<void> {
		if (!scrollerEl) return;
		const prevHeight = scrollerEl.scrollHeight;
		const prevTop = scrollerEl.scrollTop;
		maxOffset += CHUNK;
		await tick();
		scrollerEl.scrollTop = prevTop + (scrollerEl.scrollHeight - prevHeight);
	}

	function extendPast(): void {
		minOffset -= CHUNK;
	}

	async function jumpToDate(value: DateValue): Promise<void> {
		calendarOpen = false;
		const off = offsetFromDate(new Date(value.year, value.month - 1, value.day));
		minOffset = off - PAST_INIT;
		maxOffset = off + Math.ceil(CHUNK / 2);
		await tick();
		const el = scrollerEl?.querySelector<HTMLElement>(`[data-offset="${off}"]`);
		if (el && scrollerEl) {
			scrollerEl.scrollTop += el.getBoundingClientRect().top - scrollerEl.getBoundingClientRect().top;
		}
		// The target day is mounted now; tell it to expand if it was collapsed.
		eventBus.journal.jumpedTo.emit(dateKey(value));
	}

	// Watches the top/bottom sentinels and grows the window as they come into view.
	// Re-runs whenever the scroller remounts (e.g. a desk switch via {#key}).
	function infiniteScroll(node: HTMLElement) {
		scrollerEl = node;
		const top = node.querySelector('[data-sentinel="top"]')!;
		const bottom = node.querySelector('[data-sentinel="bottom"]')!;
		const observer = new IntersectionObserver(
			async (entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting || extending) continue;
					extending = true;
					if (entry.target === top) await extendFuture();
					else if (entry.target === bottom) extendPast();
					extending = false;
				}
			},
			{ root: node, rootMargin: '300px' }
		);
		observer.observe(top);
		observer.observe(bottom);
		return () => {
			observer.disconnect();
			scrollerEl = undefined;
		};
	}

	onMount(() => {
		uiState.setActiveTag(null);
		void loadJournalDays();
		// Membership only changes on a write or an applied sync, so refresh then
		// rather than polling; the query is a single cheap column scan.
		const offLocal = eventBus.sync.localChange.on(() => void loadJournalDays());
		const offSynced = eventBus.sync.synced.on(() => void loadJournalDays());
		return () => {
			offLocal();
			offSynced();
		};
	});
</script>

<div class="flex h-full flex-col">
	<div class="shrink-0 p-3">
		<Popover.Root
			open={calendarOpen}
			onOpenChange={(open) => {
				calendarOpen = open;
				if (open) void loadNoteDates();
			}}
		>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button variant="outline" size="sm" {...props}>
						<CalendarIcon class="size-4" />
						{m.journal_jump_to_date()}
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content align="start" class="frost-surface! w-auto overflow-hidden p-0">
				<Calendar
					type="single"
					bind:value={calendarValue}
					onValueChange={(v) => v && jumpToDate(v)}
					locale={navigator.language}
				>
					{#snippet day({ day: date })}
						<CalendarDay>
							{date.day}
							{#if noteDates.has(dateKey(date))}
								<div
									class={cn(
										'size-1.5 rounded-full',
										isSameDay(date, calendarValue) ? 'bg-primary-foreground' : 'bg-primary'
									)}
								></div>
							{/if}
						</CalendarDay>
					{/snippet}
				</Calendar>
			</Popover.Content>
		</Popover.Root>
	</div>

	{#key uiState.activeDesk}
		<div {@attach infiniteScroll} class="scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-16">
			<div data-sentinel="top" class="h-px w-full"></div>
			{#each offsets as offset (offset)}
				{@const day = dayFromOffset(offset)}
				<div data-offset={offset}>
					<JournalDay date={day} hasNotes={journalDays.has(dayKey(day))} />
				</div>
			{/each}
			<div data-sentinel="bottom" class="h-px w-full"></div>
		</div>
	{/key}
</div>
