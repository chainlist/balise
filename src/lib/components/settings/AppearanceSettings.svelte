<script lang="ts">
	import { themeService } from '$lib/services/theme.svelte';
	import type { Theme } from '$lib/domain/theme';
	import { SunIcon, MoonIcon, MonitorIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import BackgroundColorsSettings from './BackgroundColorsSettings.svelte';
	import PrimaryColorSettings from './PrimaryColorSettings.svelte';
	import SettingsSection from './SettingsSection.svelte';

	const themeOptions: { value: Theme; label: () => string; icon: typeof SunIcon }[] = [
		{ value: 'light', label: m.settings_theme_light, icon: SunIcon },
		{ value: 'dark', label: m.settings_theme_dark, icon: MoonIcon },
		{ value: 'system', label: m.settings_theme_system, icon: MonitorIcon }
	];
</script>

<SettingsSection
	title={m.settings_appearance_heading()}
	description={m.settings_appearance_description()}
>
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
</SettingsSection>
