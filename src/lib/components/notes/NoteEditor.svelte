<script lang="ts">
	import { onMount } from 'svelte';
	import type { Note } from '$lib/services/content/notes.svelte';
	import { eventBus } from '$lib/services/events/event-bus';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { EllipsisVerticalIcon, Trash2Icon, PinIcon } from '@lucide/svelte';
	import NoteDeleteDialog from './NoteDeleteDialog.svelte';
	import EditorView from './EditorView.svelte';
	import * as m from '$paraglide/messages.js';
	import { getCurrentWindow } from '@tauri-apps/api/window';

	let {
		note,
		onSave,
		pinnable = false,
		persistFolds = true
	}: {
		note: Note;
		onSave?: (content: string) => Promise<void>;
		pinnable?: boolean;
		persistFolds?: boolean;
	} = $props();

	let alwaysOnTop = $state(false);

	onMount(async () => {
		if (pinnable) alwaysOnTop = await getCurrentWindow().isAlwaysOnTop();
	});

	async function toggleAlwaysOnTop() {
		alwaysOnTop = !alwaysOnTop;
		await getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
	}

	let confirmOpen = $state(false);

	$effect(() => eventBus.notes.deleteRequested.on((id) => {
		if (id === note.id) confirmOpen = true;
	}));
</script>

<EditorView {note} {onSave} {persistFolds}>
	<div class="absolute top-5 right-5 -translate-y-1/2">
		{#if pinnable}
			<button
				onclick={toggleAlwaysOnTop}
				class="flex size-6 items-center justify-center rounded hover:bg-muted"
				class:text-primary={alwaysOnTop}
				class:text-muted-foreground={!alwaysOnTop}
			>
				<PinIcon class="size-4 {alwaysOnTop ? 'fill-current' : ''}" />
			</button>
		{:else}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							<EllipsisVerticalIcon class="size-4" />
						</button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<DropdownMenu.Item
						class="text-destructive focus:text-destructive"
						onclick={() => (confirmOpen = true)}
					>
						<Trash2Icon class="size-4" />
						{m.action_delete()}
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}
	</div>
</EditorView>

<NoteDeleteDialog {note} bind:open={confirmOpen} />
