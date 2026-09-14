<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { NoteListItem } from '$lib/domain/note';
	import { eventBus } from '$lib/services/events/event-bus';
	import { notesService } from '$lib/services/notes.svelte';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import {
		EllipsisVerticalIcon,
		Trash2Icon,
		PinIcon,
		PinOffIcon,
		ListTreeIcon,
		ExternalLinkIcon,
		DownloadIcon,
		LoaderCircleIcon
	} from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import NoteDeleteDialog from './NoteDeleteDialog.svelte';
	import NoteSummarySheet from './NoteSummarySheet.svelte';
	import NoteExportView from './NoteExportView.svelte';
	import { rasterizeNode } from './note-raster';
	import { exportService } from '$lib/services/export';
	import { EXPORT_FORMATS, type ExportFormat } from '$lib/domain/export';
	import EditorView from './EditorView.svelte';
	import DrawingOverlay from './DrawingOverlay.svelte';
	import DrawingControls from './DrawingControls.svelte';
	import { drawingsService } from '$lib/services/drawings.svelte';
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
		showHeader = true,
		drawable = false,
		canPin = false
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
		/** Enable the freehand drawing overlay. Only the main note view sets this —
		 *  the singleton draw session assumes one drawable editor at a time. */
		drawable?: boolean;
		/** Offer "pin to top" in the overflow menu. Only the main note view sets this:
		 *  pinning reorders the sidebar list, and `notesService` owns that list, so an
		 *  editor fed from elsewhere (the journal's per-day buckets) would show a
		 *  stale label after a toggle. */
		canPin?: boolean;
	} = $props();

	let alwaysOnTop = $state(false);

	onMount(async () => {
		if (pinnable) alwaysOnTop = await getCurrentWindow().isAlwaysOnTop();
	});

	// The component remounts per note (keyed by note.id), so one load per mount.
	onMount(async () => {
		if (!drawable) return;
		try {
			await drawingsService.load(note.id);
		} catch (e) {
			toasterService.warning(m.drawing_load_error_failed(), errorMessage(e));
		}
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

	// Mounting the offscreen export view is deferred until an export is asked for,
	// so every open note does not carry a second rendered copy of itself.
	let exportView = $state<ReturnType<typeof NoteExportView>>();
	let exportContent = $state<string | null>(null);
	let exporting = $state(false);

	async function handleExport(format: ExportFormat) {
		if (exporting) return;
		exporting = true;
		try {
			exportContent = await notesService.loadContent(note.id);
			await tick();
			await exportView?.whenReady();
			const node = exportView?.getNode();
			if (!node) throw new Error('export view did not render');

			const saved = await exportService.exportNote(
				(encoding) => rasterizeNode(node, encoding),
				format,
				note.title
			);
			if (saved) toasterService.success(m.note_export_success());
		} catch (e) {
			toasterService.error(m.note_export_error_failed(), errorMessage(e));
		} finally {
			exportContent = null;
			exporting = false;
		}
	}

	async function togglePinned() {
		try {
			await notesService.setPinned(note.id, !note.pinned);
		} catch (e) {
			toasterService.error(m.note_pin_error_failed(), errorMessage(e));
		}
	}
</script>

<EditorView bind:this={editorView} {note} {onSave} {persistFolds} {autofocus} {showHeader}>
	{#if drawable}
		<DrawingOverlay />
		<DrawingControls {floating} />
	{/if}
	<div
		class="z-20 flex items-center gap-1 {floating
			? 'fixed top-15 right-5 -translate-y-1/2'
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
					{#if canPin}
						<DropdownMenu.Item class="rounded" onclick={togglePinned}>
							{#if note.pinned}
								<PinOffIcon class="size-4" />
								{m.note_unpin()}
							{:else}
								<PinIcon class="size-4" />
								{m.note_pin()}
							{/if}
						</DropdownMenu.Item>
					{/if}
					<DropdownMenu.Item
						class="rounded"
						onclick={async () => {
							try {
								await notesService.openOriginalFile(note.id);
							} catch (e) {
								toasterService.error(m.note_open_file_error_failed(), errorMessage(e));
							}
						}}
					>
						<ExternalLinkIcon class="size-4" />
						{m.editor_open_original_file()}
					</DropdownMenu.Item>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger class="rounded">
							<DownloadIcon class="size-4" />
							{m.note_export()}
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent class="rounded">
							<DropdownMenu.Item class="rounded" onclick={() => handleExport(EXPORT_FORMATS.PDF)}>
								{m.note_export_pdf()}
							</DropdownMenu.Item>
							<DropdownMenu.Item class="rounded" onclick={() => handleExport(EXPORT_FORMATS.PNG)}>
								{m.note_export_png()}
							</DropdownMenu.Item>
							<DropdownMenu.Item class="rounded" onclick={() => handleExport(EXPORT_FORMATS.JPEG)}>
								{m.note_export_jpeg()}
							</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
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

{#if exportContent !== null}
	<NoteExportView bind:this={exportView} content={exportContent} title={note.title} />
{/if}

<!-- An export draws the note offscreen and fetches what its link cards need
     before the save dialog can open, which takes long enough to look like a
     click that did nothing. -->
{#if exporting}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center gap-3 bg-background/70 backdrop-blur-sm"
		role="status"
		aria-live="polite"
		out:fade={{ duration: 150 }}
	>
		<span class="text-sm">{m.note_export_in_progress()}</span>
		<LoaderCircleIcon class="size-4 animate-spin text-muted-foreground" />
	</div>
{/if}

<NoteDeleteDialog {note} bind:open={confirmOpen} />
