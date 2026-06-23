<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Switch } from 'bits-ui';
	import { Trash2Icon } from '@lucide/svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { desksService } from '$lib/services/desks.svelte';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { sanitizeDeskName } from '$lib/domain/desk';
	import { cn } from '$lib/utils.js';
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
	let syncEnabled = $derived(settingsService.sync.state.enabled);
	let shared = $derived(deskName ? settingsService.sync.isDeskShared(deskName) : false);

	const SWITCH_ROOT_CLASS =
		'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-container-highest';
	const SWITCH_THUMB_CLASS =
		'pointer-events-none block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5';

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
			desksService.desks.some((d) => sanitizeDeskName(d) === sanitized)
		) {
			renameError = m.desk_rename_error_exists();
			return;
		}

		saving = true;
		renameError = null;

		try {
			const old = deskName;
			await desksService.renameDesk(old, trimmed, uiState.activeTag);
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

			{#if deskName}
				<div class="flex items-center justify-between gap-4">
					<div class="space-y-0.5">
						<p class="text-sm font-medium">{m.desk_share_label()}</p>
						<p class="text-xs text-muted-foreground">
							{syncEnabled ? m.desk_share_helper() : m.desk_share_sync_off()}
						</p>
					</div>
					<Switch.Root
						checked={shared}
						disabled={!syncEnabled}
						onCheckedChange={(v) => {
							if (deskName) settingsService.sync.setDeskShared(deskName, v);
						}}
						aria-label={m.desk_share_label()}
						class={cn(SWITCH_ROOT_CLASS, !syncEnabled && 'cursor-not-allowed opacity-50')}
					>
						<Switch.Thumb class={SWITCH_THUMB_CLASS} />
					</Switch.Root>
				</div>
			{/if}

			<div class="flex items-center justify-between">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="gap-2 text-destructive hover:text-destructive"
					onclick={handleDeleteClick}
					disabled={desksService.desks.length <= 1}
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
