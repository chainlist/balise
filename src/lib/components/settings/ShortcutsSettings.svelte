<script lang="ts">
	import { onMount } from 'svelte';
	import { shortcutsService } from '$lib/services/shortcuts.svelte';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { RotateCcwIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Kbd, KbdGroup } from '$lib/components/shadcn/kbd/index.js';
	import SettingsSection from './SettingsSection.svelte';

	let listeningFor = $state<string | null>(null);
	let conflictName = $state<string | null>(null);
	let searchQuery = $state('');

	onMount(() => {
		void shortcutsService.recheck(APP_SHORTCUTS);
	});

	function reapplyIfGlobal(id: string) {
		const def = APP_SHORTCUTS.find((d) => d.id === id);
		if (def?.global) void shortcutsService.apply(def, true);
	}

	const filteredShortcuts = $derived(
		searchQuery.trim() === ''
			? APP_SHORTCUTS
			: APP_SHORTCUTS.filter((def) => {
					const q = searchQuery.toLowerCase();
					return (
						def.name().toLowerCase().includes(q) || def.description().toLowerCase().includes(q)
					);
				})
	);

	$effect(() => {
		uiState.modal.isCapturingShortcut = listeningFor !== null;
	});

	const isMac =
		typeof navigator !== 'undefined' &&
		(navigator.platform.includes('Mac') || navigator.userAgent.includes('Mac'));

	/** Split a binding into per-key display labels, one per Kbd. */
	function bindingKeys(binding: string): string[] {
		return binding.split('+').map((token) => {
			switch (token) {
				case '$mod':
					return isMac ? '⌘' : 'Ctrl';
				case 'Meta':
					return isMac ? '⌘' : 'Win';
				case 'Control':
					return 'Ctrl';
				case 'Shift':
					return '⇧';
				case 'Alt':
					return isMac ? '⌥' : 'Alt';
				case 'ArrowUp':
					return '↑';
				case 'ArrowDown':
					return '↓';
				case 'ArrowLeft':
					return '←';
				case 'ArrowRight':
					return '→';
				default:
					return token.length === 1 ? token.toUpperCase() : token;
			}
		});
	}

	function buildModifiers(e: KeyboardEvent): string[] {
		const parts: string[] = [];
		if (isMac ? e.metaKey : e.ctrlKey) parts.push('$mod');
		else if (e.ctrlKey) parts.push('Control');
		else if (e.metaKey) parts.push('Meta');
		if (e.altKey) parts.push('Alt');
		if (e.shiftKey) parts.push('Shift');
		return parts;
	}

	function buildBinding(e: KeyboardEvent): string | null {
		const key = e.key;
		const hasModifier = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
		if (['Escape', 'Enter', ' '].includes(key) && !hasModifier) return null;

		const keyName = key === ' ' ? 'Space' : key;
		if (['Control', 'Meta', 'Alt', 'Shift'].includes(keyName)) return null;

		const parts = buildModifiers(e);
		parts.push(keyName.length === 1 ? keyName.toLowerCase() : keyName);
		return parts.join('+');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!listeningFor) return;

		if (e.key === 'Escape') {
			listeningFor = null;
			conflictName = null;
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		const binding = buildBinding(e);
		if (!binding) return;

		const conflict = APP_SHORTCUTS.find(
			(def) => def.id !== listeningFor && shortcutsService.getBinding(def) === binding
		);

		if (conflict) {
			conflictName = conflict.name();
			return;
		}

		conflictName = null;
		settingsService.shortcuts.setBinding(listeningFor, binding);
		reapplyIfGlobal(listeningFor);
		listeningFor = null;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<SettingsSection
	title={m.settings_shortcuts_heading()}
	description={m.settings_shortcuts_description()}
	bodyClass={null}
>
	{#snippet header()}
		<Input type="search" bind:value={searchQuery} placeholder="Search shortcuts..." class="mt-3" />
	{/snippet}

	<div class="flex-1 overflow-y-auto scrollbar-thin">
		<table class="w-full">
			<thead>
				<tr class="border-b">
					<th class="w-40 px-6 py-2.5 text-left text-xs font-medium text-muted-foreground"
						>{m.settings_shortcuts_col_name()}</th
					>
					<th class="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground"
						>{m.settings_shortcuts_col_description()}</th
					>
					<th class="w-44 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground"
						>{m.settings_shortcuts_col_shortcut()}</th
					>
					<th class="w-10"></th>
				</tr>
			</thead>
			<tbody>
				{#each filteredShortcuts as def (def.id)}
					{@const binding = shortcutsService.getBinding(def)}
					{@const isListening = listeningFor === def.id}
					{@const hasConflict = isListening && conflictName !== null}
					<tr class="border-b transition-colors last:border-0 hover:bg-muted/30">
						<td class="flex flex-col gap-2 px-6 py-3 text-sm font-medium">
							{#if def.global}
								<div>
									<span
										class="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary uppercase"
									>
										{m.settings_shortcuts_global_badge()}
									</span>
								</div>
							{/if}
							<span>{def.name()}</span>
						</td>
						<td class="px-3 py-3 text-sm text-muted-foreground">{def.description()}</td>
						<td class="px-3 py-3">
							<button
								onclick={() => {
									listeningFor = def.id;
									conflictName = null;
								}}
								class={cn(
									'inline-flex min-w-20 items-center justify-center rounded-md border px-2.5 py-1 font-mono text-sm transition-all',
									hasConflict
										? 'border-destructive bg-destructive/5 text-destructive'
										: isListening
											? 'animate-pulse border-primary bg-primary/5 text-primary'
											: 'border-border bg-muted/50 hover:border-primary/50 hover:bg-muted'
								)}
							>
								{#if hasConflict}
									<span class="text-xs"
										>{m.settings_shortcuts_conflict({ conflictName: conflictName! })}</span
									>
								{:else if isListening}
									<span class="text-xs">{m.settings_shortcuts_listening()}</span>
								{:else}
									<KbdGroup>
										{#each bindingKeys(binding) as key, i (i)}
											<Kbd>{key}</Kbd>
										{/each}
									</KbdGroup>
								{/if}
							</button>
							{#if def.global && shortcutsService.status[def.id] === 'conflict'}
								<p class="mt-1 text-xs text-destructive">
									{m.settings_shortcuts_global_conflict()}
								</p>
							{/if}
						</td>
						<td class="py-3 pr-4">
							{#if binding !== def.defaultBinding}
								<button
									onclick={() => {
										settingsService.shortcuts.resetBinding(def.id);
										reapplyIfGlobal(def.id);
									}}
									title={m.settings_shortcuts_reset()}
									class="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								>
									<RotateCcwIcon size="13" />
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</SettingsSection>
