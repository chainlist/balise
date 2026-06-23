<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { tagsService } from '$lib/services/tags.svelte';
	import type { Tag } from '$lib/domain/tag';
	import { CheckIcon, PinIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	let { open = $bindable(false), tag }: { open?: boolean; tag: Tag | null } = $props();

	const PRESET_COLORS = [
		'#7F77DD',
		'#EF4444',
		'#F59E0B',
		'#10B981',
		'#3B82F6',
		'#EC4899',
		'#64748B'
	];

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
			<div class="flex items-center gap-2.5">
				<span
					class="size-3.5 shrink-0 rounded-full ring-1 ring-black/10"
					style="background-color: {color};"
				></span>
				<Dialog.Title class="truncate font-mono">#{tag?.tag}</Dialog.Title>
			</div>
			<Dialog.Description>{m.tag_settings_description()}</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<div class="flex flex-col gap-5 px-6 py-5">
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
					<span class="text-sm font-medium">{m.tag_color_label()}</span>
					<div class="flex items-center gap-2">
						{#each PRESET_COLORS as preset (preset)}
							<button
								type="button"
								aria-label={preset}
								onclick={() => (draftColor = preset)}
								class="flex size-7 items-center justify-center rounded-full ring-1 ring-black/10 transition-transform hover:scale-110"
								style="background-color: {preset};"
							>
								{#if color.toLowerCase() === preset.toLowerCase()}
									<CheckIcon size="14" class="text-white" />
								{/if}
							</button>
						{/each}
						<label
							class="relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-border"
							style="background-color: {color};"
						>
							<input
								type="color"
								value={color}
								oninput={(e) => (draftColor = e.currentTarget.value)}
								aria-label={m.tag_color_label()}
								class="absolute inset-0 cursor-pointer opacity-0"
							/>
						</label>
						<span class="ml-1 font-mono text-xs text-muted-foreground">{color.toUpperCase()}</span>
					</div>
				</div>
			</div>

			<div class="flex justify-end gap-2 border-t px-6 py-4">
				<Button type="button" variant="outline" onclick={handleCancel}>{m.action_cancel()}</Button>
				<Button type="submit" disabled={saving}
					>{saving ? m.action_saving() : m.action_save()}</Button
				>
			</div>
		</form>

		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onclick={() => (draftPinned = !pinned)}
			aria-label={m.tag_pin_label()}
			aria-pressed={pinned}
			class="absolute top-3 right-3 {pinned ? 'text-primary' : 'text-muted-foreground'}"
		>
			<PinIcon size="16" class={pinned ? 'fill-current' : ''} />
			<span class="sr-only">{m.tag_pin_label()}</span>
		</Button>
	</Dialog.Content>
</Dialog.Root>
