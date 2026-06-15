<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Trash2Icon } from '@lucide/svelte';
	import { uiState } from '$lib/services/app/ui-state.svelte';
	import { sanitizeDeskName } from '$lib/services/platform/desk';
	import DeleteDeskSheet from '$lib/components/sidebar/DeleteDeskSheet.svelte';
	import * as m from '$paraglide/messages.js';

	let {
		open = $bindable(false),
		deskName = $bindable<string | null>(null)
	}: { open?: boolean; deskName?: string | null } = $props();

	let draftName = $state<string | null>(null);
	let renameError = $state<string | null>(null);
	let saving = $state(false);
	let isDeleteOpen = $state(false);

	let currentName = $derived(draftName ?? deskName ?? '');

	function reset() {
		draftName = null;
		renameError = null;
	}

	function handleCancel() {
		reset();
		open = false;
	}

	async function handleSave() {
		if (!deskName) return;

		const trimmed = currentName.trim();
		if (!trimmed) {
			renameError = m.desk_rename_error_empty();
			return;
		}

		let sanitized: string;
		try {
			sanitized = sanitizeDeskName(trimmed);
		} catch {
			renameError = m.desk_rename_error_empty();
			return;
		}

		if (
			sanitized !== sanitizeDeskName(deskName) &&
			uiState.desks.some((d) => sanitizeDeskName(d) === sanitized)
		) {
			renameError = m.desk_rename_error_exists();
			return;
		}

		saving = true;
		renameError = null;

		try {
			const old = deskName;
			await uiState.renameDesk(old, trimmed);
			deskName = trimmed;
			reset();
			open = false;
		} catch {
			renameError = m.desk_rename_error_failed();
		} finally {
			saving = false;
		}
	}

	function handleDeleteClick() {
		open = false;
		isDeleteOpen = true;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.desk_settings_title()}</Dialog.Title>
			<Dialog.Description>{m.desk_settings_description()}</Dialog.Description>
		</Dialog.Header>

		<form
			class="flex flex-col gap-6 p-6"
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<div class="space-y-2">
				<label class="text-sm font-medium" for="desk-name">{m.desk_rename_label()}</label>
				<Input
					id="desk-name"
					class="rounded"
					value={currentName}
					oninput={(e) => {
						draftName = e.currentTarget.value;
						renameError = null;
					}}
					autofocus
				/>
				{#if renameError}
					<p class="text-sm text-destructive">{renameError}</p>
				{/if}
			</div>

			<div class="flex items-center justify-between">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="gap-2 text-destructive hover:text-destructive"
					onclick={handleDeleteClick}
					disabled={uiState.desks.length <= 1}
				>
					<Trash2Icon class="size-3.5" />
					{m.desk_delete_title()}
				</Button>

				<div class="flex gap-2">
					<Button type="button" variant="outline" onclick={handleCancel}>{m.action_cancel()}</Button>
					<Button type="submit" disabled={saving}>
						{saving ? m.desk_rename_saving() : m.action_save()}
					</Button>
				</div>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<DeleteDeskSheet bind:open={isDeleteOpen} bind:deskName />
