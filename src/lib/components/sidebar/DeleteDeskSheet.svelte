<script lang="ts">
	import * as Sheet from '$lib/components/shadcn/sheet/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { deleteDeskFiles } from '$lib/services/desk';
	import { uiState } from '$lib/services/ui-state.svelte';

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
		isDeletingDesk = true;

		try {
			if (desk === uiState.activeDesk) {
				const fallbackDesk = uiState.desks.find((value) => value !== desk);
				if (!fallbackDesk) {
					throw new Error('You must keep at least one desk.');
				}

				await uiState.switchDesk(fallbackDesk);
			}

			await deleteDeskFiles(desk);
			await uiState.removeDesk(desk);
			deskName = null;
			open = false;
		} catch (error) {
			deleteDeskError = error instanceof Error ? error.message : 'Failed to delete desk.';
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

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-full sm:max-w-md">
		<Sheet.Header class="gap-2 border-b p-6">
			<Sheet.Title>Delete desk</Sheet.Title>
			<Sheet.Description>
				This will permanently delete <strong>{deskName ?? 'this desk'}</strong> and all related files.
			</Sheet.Description>
		</Sheet.Header>

		<div class="flex flex-col gap-4 p-6">
			{#if deleteDeskError}
				<p class="text-sm text-destructive">{deleteDeskError}</p>
			{/if}

			<div class="mt-auto flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
				<Button
					type="button"
					variant="destructive"
					disabled={isDeletingDesk}
					onclick={handleDeleteDeskConfirm}
				>
					{isDeletingDesk ? 'Deleting...' : 'Delete desk'}
				</Button>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
