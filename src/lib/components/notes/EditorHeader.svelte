<script lang="ts">
	import * as m from '$paraglide/messages.js';
	import { settingsService } from '$lib/services/settings.svelte';

	let { readingTime, date }: { readingTime: number; date: Date } = $props();

	const intl = $derived(new Intl.DateTimeFormat(settingsService.language, { dateStyle: 'medium' }));
</script>

<div
	class="mx-auto flex w-full max-w-175 items-center gap-2 px-10 pt-4 font-mono text-xs text-muted-foreground select-none"
>
	<span class="font-bold">{intl.format(date)}</span>
	<span class="font-bold">·</span>
	<span>{m.editor_reading_time({ minutes: readingTime })}</span>
</div>
