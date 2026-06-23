<script lang="ts">
	import { onMount } from 'svelte';
	import type { NoteListItem } from '$lib/domain/note';
	import { eventBus } from '$lib/services/events/event-bus';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { EllipsisVerticalIcon, Trash2Icon, PinIcon, ListTreeIcon } from '@lucide/svelte';
	import NoteDeleteDialog from './NoteDeleteDialog.svelte';
	import NoteSummarySheet from './NoteSummarySheet.svelte';
	import EditorView from './EditorView.svelte';
	import type { OutlineItem } from '$lib/utils/cm';
	import * as m from '$paraglide/messages.js';
	import { getCurrentWindow } from '@tauri-apps/api/window';

	let {
		note,
		onSave,
		pinnable = false,
		persistFolds = true,
		autofocus = true,
		floating = true,
		showHeader = true
	}: {
		note: NoteListItem & { content?: string };
		onSave?: (content: string) => Promise<void>;
		pinnable?: boolean;
		persistFolds?: boolean;
		autofocus?: boolean;
		/** When true (default) the controls float over the viewport (single full-screen
		 *  editor). When false they anchor to this editor, for stacked editors like the
		 *  journal timeline where one fixed cluster per day would overlap. */
		floating?: boolean;
		/** Set false to hide the per-note header (date, reading time, tags), e.g. in the
		 *  journal where each day already shows its own date heading. */
		showHeader?: boolean;
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

	$effect(() =>
		eventBus.notes.deleteRequested.on((id) => {
			if (id === note.id) confirmOpen = true;
		})
	);

	let editorView = $state<ReturnType<typeof EditorView>>();
	let summaryOpen = $state(false);
	let outline = $state<OutlineItem[]>([]);

	function openSummary() {
		outline = editorView?.getOutline() ?? [];
		summaryOpen = true;
	}
</script>

<EditorView bind:this={editorView} {note} {onSave} {persistFolds} {autofocus} {showHeader}>
	<div
		class="z-20 flex items-center gap-1 {floating
			? 'fixed top-5 right-5 -translate-y-1/2'
			: 'absolute top-3 right-3'}"
	>
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
			<button
				onclick={openSummary}
				aria-label={m.editor_summary()}
				class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
			>
				<ListTreeIcon class="size-4" />
			</button>
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
				<DropdownMenu.Content align="end" class="rounded">
					<DropdownMenu.Item
						class="rounded text-destructive focus:text-destructive"
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

<NoteSummarySheet
	bind:open={summaryOpen}
	{outline}
	onNavigate={(pos) => {
		summaryOpen = false;
		editorView?.goToPosition(pos, 'start');
	}}
/>

<NoteDeleteDialog {note} bind:open={confirmOpen} />
