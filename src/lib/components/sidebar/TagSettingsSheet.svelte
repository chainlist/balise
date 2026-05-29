<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Toggle } from '$lib/components/shadcn/toggle/index.js';
	import { tagDisplayName, tagsService } from '$lib/services/tags.svelte';
	import type { Tag } from '$lib/models/tag';
	import { PinIcon, PinOffIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	let { open = $bindable(false), tag }: { open?: boolean; tag: Tag | null } = $props();

	let baseDisplayName = $derived(tag?.display_name ?? '');
	let baseColor = $derived(tag?.color ?? '#7F77DD');
	let basePinned = $derived(tag?.pinned ?? false);

	let draftDisplayName = $state<string | null>(null);
	let draftColor = $state<string | null>(null);
	let draftPinned = $state<boolean | null>(null);

	let displayName = $derived(draftDisplayName ?? baseDisplayName);
	let color = $derived(draftColor ?? baseColor);
	let pinned = $derived(draftPinned ?? basePinned);

	let saving = $state(false);

	function reset() {
		draftDisplayName = null;
		draftColor = null;
		draftPinned = null;
	}

	async function handleSave() {
		if (!tag) return;
		saving = true;
		try {
			await tagsService.setSettings(tag.tag, {
				color,
				display_name: displayName.trim() || null,
				pinned
			});
			reset();
			open = false;
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		reset();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			{#if tag}
				<Dialog.Title>{tagDisplayName(tag)}</Dialog.Title>
			{/if}
			<Dialog.Description>{m.tag_settings_description()}</Dialog.Description>
		</Dialog.Header>

		<form
			class="flex flex-col gap-6 p-6"
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<div class="space-y-2">
				<p class="text-xs font-medium text-muted-foreground">{m.tag_label()}</p>
				<p class="font-mono text-sm">#{tag?.tag}</p>
			</div>

			<div class="space-y-2">
				<label class="text-sm font-medium" for="display-name">{m.tag_display_name_label()}</label>
				<Input
					id="display-name"
					class="rounded"
					value={displayName}
					oninput={(e) => (draftDisplayName = e.currentTarget.value)}
					placeholder={tag?.tag ?? ''}
					autofocus
				/>
				<p class="text-xs text-muted-foreground">{m.tag_display_name_helper()}</p>
			</div>

			<div class="space-y-2">
				<label class="text-sm font-medium" for="tag-color">{m.tag_color_label()}</label>
				<div class="flex items-center gap-3">
					<input
						id="tag-color"
						type="color"
						value={color}
						onchange={(e) => (draftColor = e.currentTarget.value)}
						class="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
					/>
					<span class="font-mono text-sm text-muted-foreground">{color}</span>
				</div>
			</div>

			<div class="space-y-2">
				<p class="text-sm font-medium">{m.tag_pin_label()}</p>
				<Toggle
					aria-label="Toggle bookmark"
					pressed={pinned}
					onPressedChange={(v) => (draftPinned = v)}
					size="sm"
					variant="outline"
					class="data-[state=on]:bg-transparent data-[state=on]:*:[svg]:fill-blue-500 data-[state=on]:*:[svg]:stroke-blue-500"
				>
					{#if pinned}
						<PinIcon />
					{:else}
						<PinOffIcon />
					{/if}
					{m.tag_pin_toggle()}
				</Toggle>
			</div>

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={handleCancel}>{m.action_cancel()}</Button>
				<Button type="submit" disabled={saving}>{saving ? m.action_saving() : m.action_save()}</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
