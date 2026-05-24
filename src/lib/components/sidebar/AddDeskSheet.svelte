<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { sanitizeDeskName } from '$lib/services/desk';
	import { uiState } from '$lib/services/ui-state.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let newDeskName = $state('');
	let createDeskError = $state<string | null>(null);
	let isCreatingDesk = $state(false);

	async function handleCreateDesk() {
		createDeskError = null;

		const rawName = newDeskName.trim();
		if (!rawName) {
			createDeskError = 'Please enter a desk name.';
			return;
		}

		const deskName = sanitizeDeskName(rawName);
		if (uiState.desks.includes(deskName)) {
			createDeskError = 'A desk with this name already exists.';
			return;
		}

		isCreatingDesk = true;
		try {
			await uiState.addDesk(deskName);
			await uiState.switchDesk(deskName);
			newDeskName = '';
			open = false;
		} catch (error) {
			createDeskError = error instanceof Error ? error.message : 'Failed to create desk.';
		} finally {
			isCreatingDesk = false;
		}
	}

	function handleCancel() {
		open = false;
		createDeskError = null;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create a new desk</Dialog.Title>
			<Dialog.Description>Enter a name for your desk.</Dialog.Description>
		</Dialog.Header>

		<form
			class="flex flex-col gap-4 p-6"
			onsubmit={(event) => {
				event.preventDefault();
				handleCreateDesk();
			}}
		>
			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium" for="desk-name">Desk name</label>
				<Input id="desk-name" bind:value={newDeskName} placeholder="ex: Work" autofocus />
				{#if createDeskError}
					<p class="text-sm text-destructive">{createDeskError}</p>
				{/if}
			</div>

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
				<Button type="submit" disabled={isCreatingDesk}>
					{isCreatingDesk ? 'Creating...' : 'Create desk'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
