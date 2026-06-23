<script lang="ts">
	import type { MarkMode } from '$lib/domain/settings';
	import { cn } from '$lib/utils.js';
	import { Eye, EyeOff, Pencil } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	let { selectedMarkMode = $bindable<MarkMode>() } = $props();

	const markOptions = $derived([
		{
			value: 'always' as MarkMode,
			label: m.wizard_marks_always_label(),
			desc: m.wizard_marks_always_desc(),
			Icon: Eye
		},
		{
			value: 'cursor' as MarkMode,
			label: m.wizard_marks_cursor_label(),
			desc: m.wizard_marks_cursor_desc(),
			Icon: Pencil
		},
		{
			value: 'never' as MarkMode,
			label: m.wizard_marks_never_label(),
			desc: m.wizard_marks_never_desc(),
			Icon: EyeOff
		}
	]);
</script>

<h2 class="text-xl font-semibold">{m.wizard_marks_title()}</h2>
<p class="mt-1 text-sm text-muted-foreground">{m.wizard_marks_subtitle()}</p>
<div class="mt-6 flex flex-col gap-2">
	{#each markOptions as opt (opt.value)}
		{@const Icon = opt.Icon}
		<button
			class={cn(
				'flex items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors',
				selectedMarkMode === opt.value
					? 'border-foreground bg-foreground/5'
					: 'border-border hover:bg-muted/50'
			)}
			onclick={() => {
				selectedMarkMode = opt.value;
			}}
		>
			<Icon class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			<div>
				<div class="text-sm font-medium">{opt.label}</div>
				<div class="mt-0.5 text-xs text-muted-foreground">{opt.desc}</div>
			</div>
		</button>
	{/each}
</div>
