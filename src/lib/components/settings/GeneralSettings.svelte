<script lang="ts">
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { SUPPORTED_LANGUAGES, type DateFormat } from '$lib/domain/settings';
	import { applyLanguageChange } from '$lib/services/app-bootstrap';
	import { buildDateFormatOptions, formatDate } from '$lib/domain/datetime';
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

	const now = new Date();
	const dateFormatOptions = $derived(
		buildDateFormatOptions(
			now,
			settingsService.general.state.language,
			settingsService.general.state.dateFormat
		)
	);
	const dateFormatLabel = $derived(
		formatDate(now, settingsService.general.state.dateFormat, settingsService.general.state.language)
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
				{#each SUPPORTED_LANGUAGES as locale (locale)}
					<Select.Item value={locale} label={localeLabels[locale] ?? locale} />
				{/each}
			</Select.Content>
		</Select.Root>
	</SettingRow>

	<SettingRow title={m.settings_date_format_label()} description={m.settings_date_format_helper()}>
		<Select.Root
			type="single"
			value={settingsService.general.state.dateFormat}
			onValueChange={(v) => v && settingsService.general.setDateFormat(v as DateFormat)}
		>
			<Select.Trigger class="w-auto whitespace-nowrap">{dateFormatLabel}</Select.Trigger>
			<Select.Content>
				{#each dateFormatOptions as opt (opt.value)}
					<Select.Item value={opt.value} label={opt.label} />
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
