<script lang="ts">
	import { themeState, setTheme, type Theme } from '$lib/services/theme.svelte';
	import { SunIcon, MoonIcon, MonitorIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	const options: { value: Theme; label: string; icon: typeof SunIcon }[] = [
		{ value: 'light', label: 'Light', icon: SunIcon },
		{ value: 'dark', label: 'Dark', icon: MoonIcon },
		{ value: 'system', label: 'System', icon: MonitorIcon }
	];
</script>

<div class="flex flex-col h-full">
	<div class="px-6 py-4 border-b">
		<h2 class="text-base font-semibold">Appearance</h2>
		<p class="text-sm text-muted-foreground mt-0.5">Choose how the app looks.</p>
	</div>

	<div class="flex-1 overflow-y-auto px-6 py-6">
		<div class="space-y-1.5 mb-6">
			<p class="text-sm font-medium">Theme</p>
			<p class="text-xs text-muted-foreground">Select the color theme for the interface.</p>
		</div>

		<div class="flex gap-3">
			{#each options as option (option.value)}
				{@const isActive = themeState.theme === option.value}
				<button
					onclick={() => setTheme(option.value)}
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
						{option.label}
					</span>
				</button>
			{/each}
		</div>
	</div>
</div>
