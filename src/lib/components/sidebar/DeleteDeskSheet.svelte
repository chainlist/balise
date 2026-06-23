<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { desksService } from '$lib/services/desks.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { canRemoveDesk } from '$lib/domain/desk';
	import * as m from '$paraglide/messages.js';

	let {
		open = $bindable(false),
		deskName = $bindable<string | null>(null)
	}: { open?: boolean; deskName?: string | null } = $props();

	let deleteDeskError = $state<string | null>(null);
	let isDeletingDesk = $state(false);

	async function handleDeleteDeskConfirm() {
		if (!deskName) return;

		const desk = deskName;
		deleteDeskError = null;

		if (!canRemoveDesk(desksService.desks)) {
			deleteDeskError = m.desk_delete_error_min();
			return;
		}

		const wasActive = desk === desksService.activeDesk;
		isDeletingDesk = true;

		try {
			await desksService.deleteDesk(desk);
			if (wasActive) uiState.clearSelection();
			deskName = null;
			open = false;
		} catch {
			deleteDeskError = m.desk_delete_error_failed();
		} finally {
			isDeletingDesk = false;
		}
	}

	function handleCancel() {
		deskName = null;
		open = false;
		deleteDeskError = null;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.desk_delete_title()}</Dialog.Title>
			<Dialog.Description>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html m.desk_delete_description({ deskName: `<strong>${deskName ?? ''}</strong>` })}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4 p-6">
			{#if deleteDeskError}
				<p class="text-sm text-destructive">{deleteDeskError}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={handleCancel}>{m.action_cancel()}</Button>
				<Button
					type="button"
					variant="destructive"
					disabled={isDeletingDesk}
					onclick={handleDeleteDeskConfirm}
				>
					{isDeletingDesk ? m.desk_delete_deleting() : m.desk_delete_title()}
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
