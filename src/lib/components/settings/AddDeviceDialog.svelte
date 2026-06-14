<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { cn } from '$lib/utils.js';
	import EnterCodeForm from './EnterCodeForm.svelte';
	import ShowCodePanel from './ShowCodePanel.svelte';
	import * as m from '$paraglide/messages.js';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	type Mode = 'enter' | 'show';
	let mode = $state<Mode>('show');

	const tabs: { id: Mode; label: string }[] = [
		{ id: 'show', label: m.settings_sync_add_tab_show() },
		{ id: 'enter', label: m.settings_sync_add_tab_enter() }
	];

	function close() {
		open = false;
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(next) => {
		if (!next) mode = 'enter';
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.settings_sync_add_title()}</Dialog.Title>
			<Dialog.Description>{m.settings_sync_add_description()}</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4 p-6">
			<div class="flex gap-1 rounded-lg bg-muted p-1">
				{#each tabs as tab (tab.id)}
					<button
						type="button"
						onclick={() => (mode = tab.id)}
						class={cn(
							'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
							mode === tab.id
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						)}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			{#if mode === 'enter'}
				<EnterCodeForm onpaired={close} />
			{:else}
				<ShowCodePanel onpaired={close} />
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
