<script lang="ts">
	import { themeService, type Theme } from '$lib/services/theme.svelte';
	import { SunIcon, MoonIcon, MonitorIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';
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
		<div>
			<div class="mb-4 space-y-1.5">
				<p class="text-sm font-medium">{m.settings_theme_label()}</p>
				<p class="text-xs text-muted-foreground">{m.settings_theme_helper()}</p>
			</div>
			<div class="flex gap-3">
				{#each themeOptions as option (option.value)}
					{@const isActive = themeService.theme === option.value}
					<button
						onclick={() => themeService.setTheme(option.value)}
						class={cn(
							'flex w-28 flex-col items-center gap-2.5 rounded-lg border-2 p-4 transition-all',
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

		<!-- Primary color -->
		<PrimaryColorSettings />

		<!-- Background colors -->
		<BackgroundColorsSettings />
	</div>
</div>
