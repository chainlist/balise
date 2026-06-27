<script lang="ts">
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import type { MarkMode } from '$lib/domain/settings';
	import { EyeIcon, EyeOffIcon, MousePointerIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';
	import Stepper from '$lib/components/Stepper.svelte';
	import SettingsSection from './SettingsSection.svelte';
	import SettingRow from './SettingRow.svelte';
	import FontPicker from './FontPicker.svelte';

	const FONT_MIN = 12;
	const FONT_MAX = 42;
	const LH_MIN = 1.2;
	const LH_MAX = 2.5;

	const markOptions: { value: MarkMode; label: () => string; icon: typeof EyeIcon }[] = [
		{ value: 'always', label: m.settings_marks_always, icon: EyeIcon },
		{ value: 'cursor', label: m.settings_marks_cursor, icon: MousePointerIcon },
		{ value: 'never', label: m.settings_marks_never, icon: EyeOffIcon }
	];

	const setFontSize = (v: number) =>
		settingsService.editor.setFontSize(Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(v))));

	const setLineHeight = (v: number) =>
		settingsService.editor.setLineHeight(Math.min(LH_MAX, Math.max(LH_MIN, Math.round(v * 20) / 20)));
</script>

<SettingsSection
	title={m.settings_editor_heading()}
	description={m.settings_editor_description()}
	bodyClass="space-y-6"
>
	<SettingRow title={m.settings_font_family_label()} description={m.settings_font_family_helper()}>
		<FontPicker
			value={settingsService.editor.state.fontFamily}
			onValueChange={(v) => settingsService.editor.setFontFamily(v)}
		/>
	</SettingRow>

	<SettingRow title={m.settings_font_size_label()} description={m.settings_font_size_helper()}>
		<Stepper
			value={settingsService.editor.state.fontSize}
			min={FONT_MIN}
			max={FONT_MAX}
			step={1}
			onValueChange={setFontSize}
			label={m.settings_font_size_label()}
		/>
	</SettingRow>

	<SettingRow title={m.settings_line_height_label()} description={m.settings_line_height_helper()}>
		<Stepper
			value={settingsService.editor.state.lineHeight}
			min={LH_MIN}
			max={LH_MAX}
			step={0.05}
			onValueChange={setLineHeight}
			label={m.settings_line_height_label()}
		/>
	</SettingRow>

	<div class="space-y-3">
		<div class="space-y-0.5">
			<p class="text-sm font-medium">{m.settings_marks_label()}</p>
			<p class="text-xs text-muted-foreground">{m.settings_marks_helper()}</p>
		</div>
		<div class="flex gap-3">
			{#each markOptions as option (option.value)}
				{@const isActive = settingsService.editor.state.markdownMarks === option.value}
				<button
					onclick={() => settingsService.editor.setMarkdownMarks(option.value)}
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
						<div class="w-full rounded bg-muted px-2 py-1.5 text-left text-[10px] leading-relaxed">
							<div class="font-semibold text-foreground">Heading</div>
							<div class="rounded bg-primary/10 px-1 font-mono text-muted-foreground">
								**bold** _italic_
							</div>
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
</SettingsSection>
