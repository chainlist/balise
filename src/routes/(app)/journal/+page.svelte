<script lang="ts">
	import { Calendar, Day as CalendarDay } from '$lib/components/shadcn/calendar/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as Popover from '$lib/components/shadcn/popover';
	import { Calendar as CalendarIcon } from '@lucide/svelte';
	import { today, getLocalTimeZone, isSameDay } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';
	import { onMount, tick } from 'svelte';
	import { uiState } from '$lib/core/services/ui-state.svelte';
	import { desksService } from '$lib/core/services/desks.svelte';
	import { notesService } from '$lib/core/services/notes.svelte';
	import { journalService } from '$lib/core/services/journal.svelte';
	import { eventBus } from '$lib/core/services/events/event-bus';
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

	// Count of all notes (any tag) per local day, so each day's header button can
	// show how many notes it would load without querying that day individually.
	let noteCounts = $state<Map<string, number>>(new Map());

	async function loadNoteDates(): Promise<void> {
		noteDates = await notesService.noteDates();
	}

	async function loadJournalDays(): Promise<void> {
		journalDays = await journalService.journalNoteDates();
	}

	async function loadNoteCounts(): Promise<void> {
		noteCounts = await notesService.noteCountsByDay();
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

	// Folds days that scroll past the buffer into a spacer and reveals them again as they
	// come back. Folding records the day's exact height and adds it to the spacer, so the
	// total scroll height is unchanged and nothing jumps. Re-runs on every scroll frame.
	async function reconcile(): Promise<void> {
		if (!scrollerEl || reconciling) return;
		reconciling = true;
		try {
			for (let guard = 0; guard < 200; guard++) {
				if (!scrollerEl) break;
				const root = scrollerEl.getBoundingClientRect();
				const topEl = scrollerEl.querySelector<HTMLElement>(`[data-offset="${renderMax}"]`);
				const botEl = scrollerEl.querySelector<HTMLElement>(`[data-offset="${renderMin}"]`);
				if (!topEl || !botEl) break;
				const top = topEl.getBoundingClientRect();
				const bot = botEl.getBoundingClientRect();

				// Fold the topmost day once it sits entirely above the buffer.
				if (renderMax > renderMin && top.bottom < root.top - BUFFER) {
					heights.set(renderMax, topEl.offsetHeight);
					topSpacer += topEl.offsetHeight;
					renderMax--;
					await tick();
					continue;
				}
				// Fold the bottommost day once it sits entirely below the buffer.
				if (renderMax > renderMin && bot.top > root.bottom + BUFFER) {
					heights.set(renderMin, botEl.offsetHeight);
					bottomSpacer += botEl.offsetHeight;
					renderMin++;
					await tick();
					continue;
				}
				// Empty buffer above: reveal a folded day at the top (exact height, no jump).
				if (top.top > root.top - BUFFER && renderMax < maxOffset) {
					renderMax++;
					topSpacer = Math.max(0, topSpacer - (heights.get(renderMax) ?? 0));
					await tick();
					continue;
				}
				// Empty buffer below: reveal a folded day at the bottom.
				if (bot.bottom < root.bottom + BUFFER && renderMin > minOffset) {
					renderMin--;
					bottomSpacer = Math.max(0, bottomSpacer - (heights.get(renderMin) ?? 0));
					await tick();
					continue;
				}
				// Empty buffer below and nothing folded: grow into older days.
				if (bot.bottom < root.bottom + BUFFER && renderMin === minOffset) {
					minOffset--;
					renderMin--;
					await tick();
					continue;
				}
				// Empty buffer above and nothing folded: grow into future days. New content
				// above shifts the view down, so restore scrollTop to keep it steady.
				if (top.top > root.top - BUFFER && renderMax === maxOffset) {
					const prevHeight = scrollerEl.scrollHeight;
					const prevTop = scrollerEl.scrollTop;
					maxOffset++;
					renderMax++;
					await tick();
					if (scrollerEl) scrollerEl.scrollTop = prevTop + (scrollerEl.scrollHeight - prevHeight);
					continue;
				}
				break;
			}
		} finally {
			reconciling = false;
		}
	}

	async function jumpToDate(value: DateValue): Promise<void> {
		calendarOpen = false;
		const off = offsetFromDate(new Date(value.year, value.month - 1, value.day));
		// Fresh window around the target. Render window equals data window so nothing is
		// folded yet; reset the spacers and the height cache, then let reconcile re-trim.
		heights.clear();
		topSpacer = 0;
		bottomSpacer = 0;
		minOffset = off - PAST_INIT;
		maxOffset = off + Math.ceil(CHUNK / 2);
		renderMin = minOffset;
		renderMax = maxOffset;
		await tick();
		const el = scrollerEl?.querySelector<HTMLElement>(`[data-offset="${off}"]`);
		if (el && scrollerEl) {
			scrollerEl.scrollTop += el.getBoundingClientRect().top - scrollerEl.getBoundingClientRect().top;
		}
		// The target day is mounted now; tell it to expand if it was collapsed.
		eventBus.journal.jumpedTo.emit(dateKey(value));
		// Surface that day's notes in the side panel, matching the day header button.
		void uiState.setActiveDay(new Date(value.year, value.month - 1, value.day));
		void reconcile();
	}

	// Drives folding/growing as the user scrolls. Re-runs whenever the scroller remounts
	// (e.g. a desk switch via {#key}), so reset the window back to today.
	function infiniteScroll(node: HTMLElement) {
		scrollerEl = node;
		heights.clear();
		topSpacer = 0;
		bottomSpacer = 0;
		minOffset = -PAST_INIT;
		maxOffset = 0;
		renderMin = -PAST_INIT;
		renderMax = 0;
		let raf = 0;
		const onScroll = () => {
			if (raf) return;
			raf = requestAnimationFrame(() => {
				raf = 0;
				void reconcile();
			});
		};
		node.addEventListener('scroll', onScroll, { passive: true });
		// Let the window reset above flush to the DOM before the first measure.
		void tick().then(reconcile);
		return () => {
			node.removeEventListener('scroll', onScroll);
			if (raf) cancelAnimationFrame(raf);
			scrollerEl = undefined;
		};
	}

	onMount(() => {
		// Opening the journal focuses today: load today's notes into the side panel.
		void uiState.setActiveDay(new Date());
		void loadJournalDays();
		void loadNoteCounts();
		// Membership only changes on a write or an applied sync, so refresh then
		// rather than polling; the query is a single cheap column scan.
		const refresh = () => {
			void loadJournalDays();
			void loadNoteCounts();
		};
		const offLocal = eventBus.sync.localChange.on(refresh);
		const offSynced = eventBus.sync.synced.on(refresh);
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

	{#key desksService.activeDesk}
		<div {@attach infiniteScroll} class="scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-16">
			<div style="height:{topSpacer}px"></div>
			{#each rendered as offset (offset)}
				{@const day = dayFromOffset(offset)}
				<div data-offset={offset}>
					<JournalDay
						date={day}
						hasNotes={journalDays.has(dayKey(day))}
						count={noteCounts.get(dayKey(day)) ?? 0}
					/>
				</div>
			{/each}
			<div style="height:{bottomSpacer}px"></div>
		</div>
	{/key}
</div>
