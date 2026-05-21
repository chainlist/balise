<script lang="ts">
	import { settingsService } from '$lib/services/settings.svelte';
	import type { MarkMode } from '$lib/utils/cm';
	import { EyeIcon, EyeOffIcon, MousePointerIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	const FONT_MIN = 12;
	const FONT_MAX = 24;
	const LH_MIN = 1.2;
	const LH_MAX = 2.5;

	const markOptions: { value: MarkMode; label: string; icon: typeof EyeIcon }[] = [
		{ value: 'always', label: 'Always', icon: EyeIcon },
		{ value: 'cursor', label: 'On focused line', icon: MousePointerIcon },
		{ value: 'never', label: 'Never', icon: EyeOffIcon }
	];

	const inputClass =
		'w-20 rounded-md border border-input bg-background px-2 py-1 text-sm font-mono tabular-nums text-right focus:outline-none focus:ring-1 focus:ring-primary';
</script>

<div class="flex flex-col h-full">
	<div class="px-6 py-4 border-b">
		<h2 class="text-base font-semibold">Editor</h2>
		<p class="text-sm text-muted-foreground mt-0.5">Customize the writing experience.</p>
	</div>

	<div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
		<div class="flex items-center justify-between">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">Font size</p>
				<p class="text-xs text-muted-foreground">Size of text in the editor.</p>
			</div>
			<input
				type="number"
				min={FONT_MIN}
				max={FONT_MAX}
				step="1"
				value={settingsService.fontSize}
				oninput={(e) => {
					const v = Number(e.currentTarget.value);
					if (v >= FONT_MIN && v <= FONT_MAX) settingsService.setFontSize(v);
				}}
				class={inputClass}
			/>
		</div>

		<div class="flex items-center justify-between">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">Line height</p>
				<p class="text-xs text-muted-foreground">Spacing between lines of text.</p>
			</div>
			<input
				type="number"
				min={LH_MIN}
				max={LH_MAX}
				step="0.05"
				value={settingsService.lineHeight}
				oninput={(e) => {
					const v = Number(e.currentTarget.value);
					if (v >= LH_MIN && v <= LH_MAX) settingsService.setLineHeight(v);
				}}
				class={inputClass}
			/>
		</div>

		<div class="space-y-3">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">Markdown marks</p>
				<p class="text-xs text-muted-foreground">When to show raw markdown syntax.</p>
			</div>
			<div class="flex gap-3">
				{#each markOptions as option (option.value)}
					{@const isActive = settingsService.markdownMarks === option.value}
					<button
						onclick={() => settingsService.setMarkdownMarks(option.value)}
						class={cn(
							'flex flex-col items-center gap-2.5 rounded-lg border-2 p-4 flex-1 transition-all',
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
							{option.label}
						</span>

						{#if option.value === 'always'}
							<div class="w-full rounded bg-muted px-2 py-1.5 text-left font-mono text-[10px] leading-relaxed text-muted-foreground">
								<div>## Heading</div>
								<div>**bold** _italic_</div>
							</div>
						{:else if option.value === 'cursor'}
							<div class="w-full rounded bg-muted px-2 py-1.5 text-left text-[10px] leading-relaxed">
								<div class="font-semibold text-foreground">Heading</div>
								<div class="rounded bg-primary/10 px-1 font-mono text-muted-foreground">**bold** _italic_</div>
							</div>
						{:else}
							<div class="w-full rounded bg-muted px-2 py-1.5 text-left text-[10px] leading-relaxed">
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
