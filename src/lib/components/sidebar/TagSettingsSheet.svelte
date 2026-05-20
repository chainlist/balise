<script lang="ts">
	import * as Sheet from '$lib/components/shadcn/sheet/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Toggle } from '$lib/components/shadcn/toggle/index.js';
	import { tagsService, type Tag } from '$lib/services/tags.svelte';
	import { PinIcon, PinOffIcon } from '@lucide/svelte';

	let { open = $bindable(false), tag }: { open?: boolean; tag: Tag | null } = $props();

	// Base values derived from the prop — update automatically when tag changes
	let baseDisplayName = $derived(tag?.display_name ?? '');
	let baseColor = $derived(tag?.color ?? '#7F77DD');
	let basePinned = $derived(tag?.pinned ?? false);

	// User edits — null means "not yet edited, use the base value"
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

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-full sm:max-w-md">
		<Sheet.Header class="gap-2 border-b p-6">
			<Sheet.Title>#{tag?.tag}</Sheet.Title>
			<Sheet.Description>Customise how this tag appears.</Sheet.Description>
		</Sheet.Header>

		<form
			class="flex flex-1 flex-col gap-6 p-6"
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<div class="space-y-2">
				<p class="text-xs font-medium text-muted-foreground">Tag</p>
				<p class="font-mono text-sm">#{tag?.tag}</p>
			</div>

			<div class="space-y-2">
				<label class="text-sm font-medium" for="display-name">Display name</label>
				<Input
					id="display-name"
					value={displayName}
					oninput={(e) => (draftDisplayName = e.currentTarget.value)}
					placeholder={tag?.tag ?? ''}
					autofocus
				/>
				<p class="text-xs text-muted-foreground">Leave empty to use the tag name as-is.</p>
			</div>

			<div class="space-y-2">
				<label class="text-sm font-medium" for="tag-color">Color</label>
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
				<p class="text-sm font-medium">Pin to sidebar</p>
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
					Pin this tag
				</Toggle>
			</div>

			<div class="mt-auto flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
				<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
