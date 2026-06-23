<script lang="ts" module>
	export interface DatePickerAnchor {
		left: number;
		right: number;
		top: number;
		bottom: number;
	}
</script>

<script lang="ts">
	import { Calendar } from '$lib/components/shadcn/calendar/index.js';
	import * as Popover from '$lib/components/shadcn/popover';
	import { today, getLocalTimeZone, type DateValue } from '@internationalized/date';
	import { settingsService } from '$lib/services/settings/settings.svelte';

	let {
		anchor,
		onSelect,
		onDismiss
	}: {
		anchor: DatePickerAnchor;
		onSelect: (date: Date) => void;
		onDismiss: () => void;
	} = $props();

	// Virtual anchor at the `@` so the popover can flip/shift to stay in view.
	const customAnchor = {
		getBoundingClientRect: () =>
			new DOMRect(anchor.left, anchor.top, anchor.right - anchor.left, anchor.bottom - anchor.top)
	};

	// No value bound: the calendar opens on the current month (placeholder) and
	// every click — including on today — fires onValueChange.
	let placeholder = $state<DateValue>(today(getLocalTimeZone()));

	function toJSDate(dv: DateValue): Date {
		return new Date(dv.year, dv.month - 1, dv.day);
	}
</script>

<Popover.Root
	open
	onOpenChange={(o) => {
		if (!o) onDismiss();
	}}
>
	<Popover.Content
		{customAnchor}
		side="bottom"
		align="start"
		sideOffset={6}
		collisionPadding={8}
		onOpenAutoFocus={(e) => e.preventDefault()}
		onCloseAutoFocus={(e) => e.preventDefault()}
		class="w-auto overflow-hidden frost-surface! p-0"
	>
		<Calendar
			type="single"
			bind:placeholder
			onValueChange={(v) => {
				if (v) onSelect(toJSDate(v));
			}}
			locale={settingsService.general.state.language}
		/>
	</Popover.Content>
</Popover.Root>
