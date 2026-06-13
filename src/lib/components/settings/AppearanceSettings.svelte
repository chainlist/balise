<script lang="ts">
	import { themeService, type Theme } from '$lib/services/theme.svelte';
	import { SunIcon, MoonIcon, MonitorIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import BackgroundColorsSettings from './BackgroundColorsSettings.svelte';
	import PrimaryColorSettings from './PrimaryColorSettings.svelte';

	const themeOptions: { value: Theme; label: () => string; icon: typeof SunIcon }[] = [
		{ value: 'light', label: m.settings_theme_light, icon: SunIcon },
		{ value: 'dark', label: m.settings_theme_dark, icon: MoonIcon },
		{ value: 'system', label: m.settings_theme_system, icon: MonitorIcon }
	];
</script>

<div class="flex h-full flex-col">
	<div class="border-b px-6 py-4">
		<h2 class="text-base font-semibold">{m.settings_appearance_heading()}</h2>
		<p class="mt-0.5 text-sm text-muted-foreground">{m.settings_appearance_description()}</p>
	</div>

	<div class="flex-1 space-y-8 overflow-y-auto px-6 py-6">
		<!-- Theme -->
		<div class="flex items-center justify-between gap-4">
			<div class="space-y-1.5">
				<p class="text-sm font-medium">{m.settings_theme_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_theme_helper()}</p>
			</div>
			<SegmentedToggle
				options={themeOptions}
				value={themeService.theme}
				onValueChange={(theme) => themeService.setTheme(theme)}
			/>
		</div>

		<!-- Primary color -->
		<PrimaryColorSettings />

		<!-- Background colors -->
		<BackgroundColorsSettings />
	</div>
</div>
