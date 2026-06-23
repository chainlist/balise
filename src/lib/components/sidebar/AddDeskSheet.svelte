<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { sanitizeDeskName } from '$lib/domain/desk';
	import { desksService } from '$lib/services/desks.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import * as m from '$paraglide/messages.js';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let newDeskName = $state('');
	let createDeskError = $state<string | null>(null);
	let isCreatingDesk = $state(false);

	async function handleCreateDesk() {
		createDeskError = null;

		const rawName = newDeskName.trim();
		if (!rawName) {
			createDeskError = m.desk_create_error_empty();
			return;
		}

		const deskName = sanitizeDeskName(rawName);
		if (desksService.desks.includes(deskName)) {
			createDeskError = m.desk_create_error_exists();
			return;
		}

		isCreatingDesk = true;
		try {
			await desksService.addDesk(deskName);
			await desksService.switchDesk(deskName);
			uiState.clearSelection();
			newDeskName = '';
			open = false;
		} catch {
			createDeskError = m.desk_create_error_failed();
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
			<Dialog.Title>{m.desk_create_title()}</Dialog.Title>
			<Dialog.Description>{m.desk_create_description()}</Dialog.Description>
		</Dialog.Header>

		<form
			class="flex flex-col gap-4 p-6"
			onsubmit={(event) => {
				event.preventDefault();
				handleCreateDesk();
			}}
		>
			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium" for="desk-name">{m.desk_name_label()}</label>
				<Input id="desk-name" bind:value={newDeskName} placeholder={m.desk_name_placeholder()} autofocus />
				{#if createDeskError}
					<p class="text-sm text-destructive">{createDeskError}</p>
				{/if}
			</div>

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={handleCancel}>{m.action_cancel()}</Button>
				<Button type="submit" disabled={isCreatingDesk}>
					{isCreatingDesk ? m.desk_create_creating() : m.desk_create_submit()}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
