<script lang="ts">
	import { settingsService, SUPPORTED_LOCALES } from '$lib/services/settings.svelte';
	import * as m from '$paraglide/messages.js';
	import * as Select from '$lib/components/shadcn/select/index.js';

	const localeLabels: Record<string, string> = {
		en: 'English',
		fr: 'Français',
		es: 'Español',
		de: 'Deutsch'
	};

	const languageLabel = $derived(
		localeLabels[settingsService.language] ?? settingsService.language
	);

	const closeBehaviorValue = $derived(
		settingsService.closeToTray === true
			? 'tray'
			: settingsService.closeToTray === false
				? 'quit'
				: undefined
	);

	const closeBehaviorLabel = $derived(
		settingsService.closeToTray === true
			? m.close_behavior_tray()
			: settingsService.closeToTray === false
				? m.close_behavior_quit()
				: '—'
	);
</script>

<div class="flex h-full flex-col">
	<div class="border-b px-6 py-4">
		<h2 class="text-base font-semibold">{m.settings_general_heading()}</h2>
		<p class="mt-0.5 text-sm text-muted-foreground">{m.settings_general_description()}</p>
	</div>

	<div class="flex-1 space-y-8 overflow-y-auto px-6 py-6">
		<div class="flex items-center justify-between">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">{m.settings_language_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_language_helper()}</p>
			</div>
			<Select.Root
				type="single"
				value={settingsService.language}
				onValueChange={(v) => v && settingsService.setLanguage(v)}
			>
				<Select.Trigger class="w-auto whitespace-nowrap">{languageLabel}</Select.Trigger>
				<Select.Content>
					{#each SUPPORTED_LOCALES as locale (locale)}
						<Select.Item value={locale} label={localeLabels[locale] ?? locale} />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="flex items-center justify-between">
			<div class="space-y-0.5">
				<p class="text-sm font-medium">{m.settings_close_behavior_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_close_behavior_helper()}</p>
			</div>
			<Select.Root
				type="single"
				value={closeBehaviorValue}
				onValueChange={(v) => v && settingsService.setCloseToTray(v === 'tray')}
			>
				<Select.Trigger class="w-auto whitespace-nowrap">{closeBehaviorLabel}</Select.Trigger>
				<Select.Content>
					<Select.Item value="tray" label={m.close_behavior_tray()} />
					<Select.Item value="quit" label={m.close_behavior_quit()} />
				</Select.Content>
			</Select.Root>
		</div>
	</div>
</div>
