<script lang="ts">
	import { getBinding, setBinding, resetBinding } from '$lib/services/shortcuts.svelte';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { RotateCcwIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let listeningFor = $state<string | null>(null);
	let conflictName = $state<string | null>(null);

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

	function buildBinding(e: KeyboardEvent): string | null {
		const key = e.key;

		const BLOCKED_BARE = ['Escape', 'Enter', ' '];
		const hasModifier = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
		if (BLOCKED_BARE.includes(key) && !hasModifier) return null;

		const parts: string[] = [];
		if (isMac ? e.metaKey : e.ctrlKey) parts.push('$mod');
		else if (e.ctrlKey) parts.push('Control');
		else if (e.metaKey) parts.push('Meta');
		if (e.altKey) parts.push('Alt');
		if (e.shiftKey) parts.push('Shift');

		const keyName = key === ' ' ? 'Space' : key;
		const isModifierKey = ['Control', 'Meta', 'Alt', 'Shift'].includes(keyName);
		if (isModifierKey) return null;

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
			(def) => def.id !== listeningFor && getBinding(def) === binding
		);

		if (conflict) {
			conflictName = conflict.name;
			return;
		}

		conflictName = null;
		setBinding(listeningFor, binding);
		listeningFor = null;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col h-full">
	<div class="px-6 py-4 border-b">
		<h2 class="text-base font-semibold">Shortcuts</h2>
		<p class="text-sm text-muted-foreground mt-0.5">Click a shortcut to reassign it.</p>
	</div>

	<div class="flex-1 overflow-y-auto">
		<table class="w-full">
			<thead>
				<tr class="border-b">
					<th class="text-left text-xs font-medium text-muted-foreground px-6 py-2.5 w-40">Name</th>
					<th class="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Description</th>
					<th class="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-44">Shortcut</th>
					<th class="w-10"></th>
				</tr>
			</thead>
			<tbody>
				{#each APP_SHORTCUTS as def (def.id)}
					{@const binding = getBinding(def)}
					{@const isListening = listeningFor === def.id}
					{@const hasConflict = isListening && conflictName !== null}
					<tr class="border-b last:border-0 hover:bg-muted/30 transition-colors">
						<td class="px-6 py-3 text-sm font-medium">{def.name}</td>
						<td class="px-3 py-3 text-sm text-muted-foreground">{def.description}</td>
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
									<span class="text-xs">Used by {conflictName}</span>
								{:else if isListening}
									<span class="text-xs">Press shortcut…</span>
								{:else}
									{formatBinding(binding)}
								{/if}
							</button>
						</td>
						<td class="pr-4 py-3">
							{#if binding !== def.defaultBinding}
								<button
									onclick={() => resetBinding(def.id)}
									title="Reset to default"
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
