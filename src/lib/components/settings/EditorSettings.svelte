<script lang="ts">
	import { settingsService } from '$lib/services/settings.svelte';
	import type { MarkMode } from '$lib/utils/cm';
	import { EyeIcon, EyeOffIcon, MousePointerIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';

	const FONT_MIN = 12;
	const FONT_MAX = 42;
	const LH_MIN = 1.2;
	const LH_MAX = 2.5;

	const markOptions: { value: MarkMode; label: () => string; icon: typeof EyeIcon }[] = [
		{ value: 'always', label: m.settings_marks_always, icon: EyeIcon },
		{ value: 'cursor', label: m.settings_marks_cursor, icon: MousePointerIcon },
		{ value: 'never', label: m.settings_marks_never, icon: EyeOffIcon }
	];

	const inputClass =
		'w-20 rounded-md border border-input bg-background px-2 py-1 text-sm font-mono tabular-nums text-right focus:outline-none focus:ring-1 focus:ring-primary';
</script>

<div class="flex h-full flex-col">
	<div class="border-b px-6 py-4">
		<h2 class="text-base font-semibold">{m.settings_editor_heading()}</h2>
		<p class="mt-0.5 text-sm text-muted-foreground">{m.settings_editor_description()}</p>
	</div>

	<div class="flex-1 space-y-6 overflow-y-auto px-6 py-6">
		<div class="flex items-center justify-between">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">{m.settings_font_size_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_font_size_helper()}</p>
			</div>
			<input
				type="number"
				min={FONT_MIN}
				max={FONT_MAX}
				step="1"
				value={settingsService.editor.fontSize}
				oninput={(e) => {
					const v = Number(e.currentTarget.value);
					if (v >= FONT_MIN && v <= FONT_MAX) settingsService.setFontSize(v);
				}}
				class={inputClass}
			/>
		</div>

		<div class="flex items-center justify-between">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">{m.settings_line_height_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_line_height_helper()}</p>
			</div>
			<input
				type="number"
				min={LH_MIN}
				max={LH_MAX}
				step="0.05"
				value={settingsService.editor.lineHeight}
				oninput={(e) => {
					const v = Number(e.currentTarget.value);
					if (v >= LH_MIN && v <= LH_MAX) settingsService.setLineHeight(v);
				}}
				class={inputClass}
			/>
		</div>

		<div class="space-y-3">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">{m.settings_marks_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_marks_helper()}</p>
			</div>
			<div class="flex gap-3">
				{#each markOptions as option (option.value)}
					{@const isActive = settingsService.editor.markdownMarks === option.value}
					<button
						onclick={() => settingsService.setMarkdownMarks(option.value)}
						class={cn(
							'flex flex-1 flex-col items-center gap-2.5 rounded-lg border-2 p-4 transition-all',
							isActive
								? 'border-primary bg-primary/5'
								: 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
						)}
					>
						<div
							class={cn(
								'flex size-9 items-center justify-center rounded-md',
								isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
							)}
						>
							<option.icon size={18} />
						</div>
						<span class={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
							{option.label()}
						</span>

						{#if option.value === 'always'}
							<div
								class="w-full rounded bg-muted px-2 py-1.5 text-left font-mono text-[10px] leading-relaxed text-muted-foreground"
							>
								<div>## Heading</div>
								<div>**bold** _italic_</div>
							</div>
						{:else if option.value === 'cursor'}
							<div
								class="w-full rounded bg-muted px-2 py-1.5 text-left text-[10px] leading-relaxed"
							>
								<div class="font-semibold text-foreground">Heading</div>
								<div class="rounded bg-primary/10 px-1 font-mono text-muted-foreground">
									**bold** _italic_
								</div>
							</div>
						{:else}
							<div
								class="w-full rounded bg-muted px-2 py-1.5 text-left text-[10px] leading-relaxed"
							>
								<div class="font-semibold text-foreground">Heading</div>
								<div class="text-foreground"><strong>bold</strong> <em>italic</em></div>
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
