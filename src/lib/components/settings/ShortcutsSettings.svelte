<script lang="ts">
	import { shortcutsService } from '$lib/services/shortcuts.svelte';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { RotateCcwIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';
	import { Input } from '$lib/components/shadcn/input/index.js';

	let listeningFor = $state<string | null>(null);
	let conflictName = $state<string | null>(null);
	let searchQuery = $state('');

	const filteredShortcuts = $derived(
		searchQuery.trim() === ''
			? APP_SHORTCUTS
			: APP_SHORTCUTS.filter((def) => {
					const q = searchQuery.toLowerCase();
					return def.name().toLowerCase().includes(q) || def.description().toLowerCase().includes(q);
				})
	);

	$effect(() => {
		uiState.isCapturingShortcut = listeningFor !== null;
	});

	const isMac =
		typeof navigator !== 'undefined' &&
		(navigator.platform.includes('Mac') || navigator.userAgent.includes('Mac'));

	function formatBinding(binding: string): string {
		return binding
			.replace(/\$mod/g, isMac ? '⌘' : 'Ctrl')
			.replace(/Shift/g, isMac ? '⇧' : 'Shift')
			.replace(/Alt/g, isMac ? '⌥' : 'Alt')
			.replace(/\+/g, isMac ? '' : '+');
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
		shortcutsService.setBinding(listeningFor, binding);
		listeningFor = null;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col h-full">
	<div class="px-6 py-4 border-b">
		<h2 class="text-base font-semibold">{m.settings_shortcuts_heading()}</h2>
		<p class="text-sm text-muted-foreground mt-0.5">{m.settings_shortcuts_description()}</p>
		<Input
			type="search"
			bind:value={searchQuery}
			placeholder="Search shortcuts..."
			class="mt-3"
		/>
	</div>

	<div class="flex-1 overflow-y-auto">
		<table class="w-full">
			<thead>
				<tr class="border-b">
					<th class="text-left text-xs font-medium text-muted-foreground px-6 py-2.5 w-40">{m.settings_shortcuts_col_name()}</th>
					<th class="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">{m.settings_shortcuts_col_description()}</th>
					<th class="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-44">{m.settings_shortcuts_col_shortcut()}</th>
					<th class="w-10"></th>
				</tr>
			</thead>
			<tbody>
				{#each filteredShortcuts as def (def.id)}
					{@const binding = shortcutsService.getBinding(def)}
					{@const isListening = listeningFor === def.id}
					{@const hasConflict = isListening && conflictName !== null}
					<tr class="border-b last:border-0 hover:bg-muted/30 transition-colors">
						<td class="px-6 py-3 text-sm font-medium">{def.name()}</td>
						<td class="px-3 py-3 text-sm text-muted-foreground">{def.description()}</td>
						<td class="px-3 py-3">
							<button
								onclick={() => { listeningFor = def.id; conflictName = null; }}
								class={cn(
									'inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-sm font-mono transition-all min-w-20',
									hasConflict
										? 'border-destructive bg-destructive/5 text-destructive'
										: isListening
											? 'border-primary bg-primary/5 text-primary animate-pulse'
											: 'border-border bg-muted/50 hover:border-primary/50 hover:bg-muted'
								)}
							>
								{#if hasConflict}
									<span class="text-xs">{m.settings_shortcuts_conflict({ conflictName: conflictName! })}</span>
								{:else if isListening}
									<span class="text-xs">{m.settings_shortcuts_listening()}</span>
								{:else}
									{formatBinding(binding)}
								{/if}
							</button>
						</td>
						<td class="pr-4 py-3">
							{#if binding !== def.defaultBinding}
								<button
									onclick={() => shortcutsService.resetBinding(def.id)}
									title={m.settings_shortcuts_reset()}
									class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
</div>
