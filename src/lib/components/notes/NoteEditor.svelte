<script lang="ts">
	import { EditorView, keymap } from '@codemirror/view';
	import { Compartment } from '@codemirror/state';
	import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
	import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
	import { GFM } from '@lezer/markdown';
	import { languages } from '@codemirror/language-data';
	import { codeFolding, foldGutter, foldKeymap, foldNodeProp } from '@codemirror/language';
	import { untrack, onMount } from 'svelte';
	import { closeBrackets, completionKeymap } from '@codemirror/autocomplete';
	import {
		mdSyntaxHighlighting,
		mdHidePlugin,
		mdBulletPlugin,
		mdHrPlugin,
		mdHeaderPlugin,
		mdCodePlugin,
		mdTagPlugin,
		mdCheckboxPlugin,
		mdTaskTagPlugin,
		mdHighlightPlugin,
		mdFormatPlugin,
		mdLinkPlugin,
		mdSlashPlugin,
		mdPlaceholderPlugin,
		mdMarkNavPlugin,
		mdImagePlugin,
		mdTagCompletion,
		noteEditorTheme,
		type MarkMode
	} from '$lib/utils/cm';
	import { notesService, type Note } from '$lib/services/notes.svelte';
	import { settingsService } from '$lib/services/settings.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { noteSignals } from '$lib/services/note-signals';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { EllipsisVerticalIcon, Trash2Icon, PinIcon } from '@lucide/svelte';
	import NoteDeleteDialog from './NoteDeleteDialog.svelte';
	import * as m from '$paraglide/messages.js';
	import { getCurrentWindow } from '@tauri-apps/api/window';

	let {
		note,
		onSave,
		pinnable = false
	}: { note: Note; onSave?: (content: string) => Promise<void>; pinnable?: boolean } = $props();

	let alwaysOnTop = $state(false);

	onMount(async () => {
		if (pinnable) alwaysOnTop = await getCurrentWindow().isAlwaysOnTop();
	});

	async function toggleAlwaysOnTop() {
		alwaysOnTop = !alwaysOnTop;
		await getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
	}

	let confirmOpen = $state(false);
	let editorView = $state<EditorView | null>(null);
	const markCompartment = new Compartment();

	function makeMarkPlugins(mode: MarkMode) {
		return [
			mdHidePlugin(mode),
			mdMarkNavPlugin(mode),
			mdBulletPlugin(mode),
			mdHrPlugin(mode),
			mdHeaderPlugin(mode),
			mdHighlightPlugin(mode),
			mdLinkPlugin(mode),
			mdTagPlugin(mode),
			mdCheckboxPlugin(mode),
			mdTaskTagPlugin(mode),
			mdImagePlugin(mode)
		];
	}

	$effect(() => noteSignals.onDeleteNote((id) => {
		if (id === note.id) confirmOpen = true;
	}));

	$effect(() => {
		const mode = settingsService.markdownMarks;
		const effectiveMode: MarkMode = mode === 'cursor' && uiState.focusedNoteId !== note.id ? 'never' : mode;
		if (editorView) {
			editorView.dispatch({ effects: markCompartment.reconfigure(makeMarkPlugins(effectiveMode)) });
		}
	});

	async function mount(container: HTMLDivElement) {
		return untrack(async () => {
			const editorEl = container.querySelector<HTMLDivElement>('[data-editor]')!;
			let saveTimer: ReturnType<typeof setTimeout>;

			const noteId = note.id;
			const noteContent = await notesService.loadContent(noteId);

			const view = new EditorView({
				doc: noteContent,
				extensions: [
					// Core
					history(),
					EditorView.lineWrapping,
					// Language / syntax
					markdown({
						base: markdownLanguage,
						extensions: [GFM, { props: [foldNodeProp.add({ Paragraph: () => null })] }],
						codeLanguages: languages
					}),
					mdSyntaxHighlighting,
					codeFolding(),
					foldGutter(),
					mdCodePlugin,
					// Keybindings
					mdFormatPlugin,
					keymap.of([
						...defaultKeymap,
						...historyKeymap,
						...foldKeymap,
						...completionKeymap,
						indentWithTab
					]),
					// Editing helpers
					closeBrackets(),
					mdTagCompletion,
					mdSlashPlugin,
					mdPlaceholderPlugin,
					// Mark visibility (dynamically reconfigured)
					markCompartment.of(makeMarkPlugins(settingsService.markdownMarks)),
					// Theme
					noteEditorTheme,
					// Save on change
					EditorView.updateListener.of((u) => {
						if (u.focusChanged) {
							if (u.view.hasFocus) uiState.focusedNoteId = noteId;
							else if (uiState.focusedNoteId === noteId) uiState.focusedNoteId = null;
						}
						if (!u.docChanged) return;
						clearTimeout(saveTimer);
						const val = u.state.doc.toString().replace(/[ \t]+$/gm, '');
						saveTimer = setTimeout(async () => {
							if (onSave) await onSave(val);
							else await notesService.update(noteId, val);
						}, 500);
					})
				],
				parent: editorEl
			});

			editorView = view;
			if (!uiState.focusedNoteId) {
				uiState.focusedNoteId = noteId;
				view.focus();
			}

			return () => {
				clearTimeout(saveTimer);
				if (uiState.focusedNoteId === noteId) uiState.focusedNoteId = null;
				editorView = null;
				view.destroy();
			};
		});
	}
</script>

<div {@attach mount} class="relative h-full overflow-y-auto">
	<div data-editor class="mx-auto w-full max-w-175"></div>

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
</div>

<NoteDeleteDialog {note} bind:open={confirmOpen} />
