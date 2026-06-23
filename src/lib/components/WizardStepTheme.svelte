<script lang="ts">
	import { themeService } from '$lib/core/services/theme.svelte';
	import type { Theme } from '$lib/core/domain/theme';
	import { cn } from '$lib/utils.js';
	import { Sun, Moon, Monitor } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import PrimaryColorSettings from './settings/PrimaryColorSettings.svelte';
	import BackgroundColorsSettings from './settings/BackgroundColorsSettings.svelte';

	let { selectedTheme = $bindable<Theme>() } = $props();

	const themeOptions = $derived([
		{ value: 'light' as Theme, label: m.wizard_theme_light_label(), Icon: Sun },
		{ value: 'system' as Theme, label: m.wizard_theme_system_label(), Icon: Monitor },
		{ value: 'dark' as Theme, label: m.wizard_theme_dark_label(), Icon: Moon }
	]);

	function selectTheme(theme: Theme) {
		selectedTheme = theme;
		themeService.setTheme(theme);
	}
</script>

<h2 class="text-xl font-semibold">{m.wizard_theme_title()}</h2>
<p class="mt-1 text-sm text-muted-foreground">{m.wizard_theme_subtitle()}</p>
<div class="mt-6 grid grid-cols-3 gap-3">
	{#each themeOptions as opt (opt.value)}
		{@const Icon = opt.Icon}
		<button
			class={cn(
				'flex flex-col items-center gap-2 rounded-md border px-3 py-4 transition-colors',
				selectedTheme === opt.value
					? 'border-foreground bg-foreground/5'
					: 'border-border hover:bg-muted/50'
			)}
			onclick={() => selectTheme(opt.value)}
		>
			<Icon class="h-5 w-5 text-muted-foreground" />
			<span class="text-sm">{opt.label}</span>
		</button>
	{/each}
</div>

<div class="mt-8 space-y-8">
	<PrimaryColorSettings />
	<BackgroundColorsSettings />
</div>
