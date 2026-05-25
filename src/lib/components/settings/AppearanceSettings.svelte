<script lang="ts">
	import { themeService, type Theme } from '$lib/services/theme.svelte';
	import { settingsService, SUPPORTED_LOCALES } from '$lib/services/settings.svelte';
	import { SunIcon, MoonIcon, MonitorIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';

	const themeOptions: { value: Theme; label: () => string; icon: typeof SunIcon }[] = [
		{ value: 'light', label: m.settings_theme_light, icon: SunIcon },
		{ value: 'dark', label: m.settings_theme_dark, icon: MoonIcon },
		{ value: 'system', label: m.settings_theme_system, icon: MonitorIcon }
	];

	const localeLabels: Record<string, string> = {
		en: 'English',
		fr: 'Français',
		es: 'Español'
	};
</script>

<div class="flex flex-col h-full">
	<div class="px-6 py-4 border-b">
		<h2 class="text-base font-semibold">{m.settings_appearance_heading()}</h2>
		<p class="text-sm text-muted-foreground mt-0.5">{m.settings_appearance_description()}</p>
	</div>

	<div class="flex-1 overflow-y-auto px-6 py-6 space-y-8">
		<!-- Theme -->
		<div>
			<div class="space-y-1.5 mb-4">
				<p class="text-sm font-medium">{m.settings_theme_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_theme_helper()}</p>
			</div>
			<div class="flex gap-3">
				{#each themeOptions as option (option.value)}
					{@const isActive = themeService.theme === option.value}
					<button
						onclick={() => themeService.setTheme(option.value)}
						class={cn(
							'flex flex-col items-center gap-2.5 rounded-lg border-2 p-4 w-28 transition-all',
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
							<option.icon size="18" />
						</div>
						<span class={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
							{option.label()}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Language -->
		<div>
			<div class="space-y-1.5 mb-4">
				<p class="text-sm font-medium">{m.settings_language_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_language_helper()}</p>
			</div>
			<div class="flex gap-3">
				{#each SUPPORTED_LOCALES as locale (locale)}
					{@const isActive = settingsService.language === locale}
					<button
						onclick={() => settingsService.setLanguage(locale)}
						class={cn(
							'rounded-lg border-2 px-5 py-3 text-sm font-medium transition-all',
							isActive
								? 'border-primary bg-primary/5 text-primary'
								: 'border-border text-foreground hover:border-muted-foreground/40 hover:bg-muted/50'
						)}
					>
						{localeLabels[locale] ?? locale}
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
