<script lang="ts">
	import { settingsService, SUPPORTED_LOCALES } from '$lib/services/settings/settings.svelte';
	import { applyLanguageChange } from '$lib/utils/init-app';
	import * as m from '$paraglide/messages.js';
	import * as Select from '$lib/components/shadcn/select/index.js';
	import { Switch } from 'bits-ui';
	import SettingsSection from './SettingsSection.svelte';
	import SettingRow from './SettingRow.svelte';

	const localeLabels: Record<string, string> = {
		en: 'English',
		fr: 'Français',
		es: 'Español',
		de: 'Deutsch'
	};

	const languageLabel = $derived(
		localeLabels[settingsService.general.state.language] ?? settingsService.general.state.language
	);

	const closeBehaviorValue = $derived(
		settingsService.general.state.closeToTray === true
			? 'tray'
			: settingsService.general.state.closeToTray === false
				? 'quit'
				: undefined
	);

	const closeBehaviorLabel = $derived(
		settingsService.general.state.closeToTray === true
			? m.close_behavior_tray()
			: settingsService.general.state.closeToTray === false
				? m.close_behavior_quit()
				: '—'
	);
</script>

<SettingsSection title={m.settings_general_heading()} description={m.settings_general_description()}>
	<SettingRow title={m.settings_language_label()} description={m.settings_language_helper()}>
		<Select.Root
			type="single"
			value={settingsService.general.state.language}
			onValueChange={(v) => v && applyLanguageChange(v)}
		>
			<Select.Trigger class="w-auto whitespace-nowrap">{languageLabel}</Select.Trigger>
			<Select.Content>
				{#each SUPPORTED_LOCALES as locale (locale)}
					<Select.Item value={locale} label={localeLabels[locale] ?? locale} />
				{/each}
			</Select.Content>
		</Select.Root>
	</SettingRow>

	<SettingRow
		title={m.settings_close_behavior_label()}
		description={m.settings_close_behavior_helper()}
	>
		<Select.Root
			type="single"
			value={closeBehaviorValue}
			onValueChange={(v) => v && settingsService.general.setCloseToTray(v === 'tray')}
		>
			<Select.Trigger class="w-auto whitespace-nowrap">{closeBehaviorLabel}</Select.Trigger>
			<Select.Content>
				<Select.Item value="tray" label={m.close_behavior_tray()} />
				<Select.Item value="quit" label={m.close_behavior_quit()} />
			</Select.Content>
		</Select.Root>
	</SettingRow>

	<SettingRow title={m.settings_auto_update_label()} description={m.settings_auto_update_helper()}>
		<Switch.Root
			checked={settingsService.general.state.autoUpdate}
			onCheckedChange={(checked) => settingsService.general.setAutoUpdate(checked)}
			aria-label={m.settings_auto_update_label()}
			class="inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-container-highest"
		>
			<Switch.Thumb
				class="pointer-events-none block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
			/>
		</Switch.Root>
	</SettingRow>
</SettingsSection>
