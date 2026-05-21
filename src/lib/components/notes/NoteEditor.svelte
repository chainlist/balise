<script lang="ts">
	import { EditorView, keymap } from '@codemirror/view';
	import { Compartment } from '@codemirror/state';
	import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
	import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
	import { GFM } from '@lezer/markdown';
	import { languages } from '@codemirror/language-data';
	import { untrack } from 'svelte';
	import {
		mdStylePlugin,
		mdHidePlugin,
		mdCodePlugin,
		mdTagPlugin,
		mdHighlightPlugin,
		mdPairPlugin,
		mdFormatPlugin,
		mdLinkPlugin,
		noteEditorTheme,
		type MarkMode
	} from '$lib/utils/cm';
	import { notesService, type Note } from '$lib/services/notes.svelte';
	import { settingsService } from '$lib/services/settings.svelte';
	import { noteSignals } from '$lib/services/note-signals';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import * as Sheet from '$lib/components/shadcn/sheet/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { EllipsisVerticalIcon, Trash2Icon } from '@lucide/svelte';

	let { note }: { note: Note } = $props();

	let confirmOpen = $state(false);
	let editorView = $state<EditorView | null>(null);
	const markCompartment = new Compartment();

	function makeMarkPlugins(mode: MarkMode) {
		return [
			mdHidePlugin(mode),
			mdHighlightPlugin(mode),
			mdLinkPlugin(mode),
			mdTagPlugin(mode)
		];
	}

	$effect(() => noteSignals.onDeleteNote((id) => {
		if (id === note.id) confirmOpen = true;
	}));

	$effect(() => {
		const mode = settingsService.markdownMarks;
		if (editorView) {
			editorView.dispatch({ effects: markCompartment.reconfigure(makeMarkPlugins(mode)) });
		}
	});

	function mount(container: HTMLDivElement) {
		return untrack(() => {
			const editorEl = container.querySelector<HTMLDivElement>('[data-editor]')!;
			let saveTimer: ReturnType<typeof setTimeout>;

			const noteId = note.id;
			const noteContent = note.content;

			const view = new EditorView({
				doc: noteContent,
				extensions: [
					history(),
					mdFormatPlugin,
					keymap.of([...defaultKeymap, ...historyKeymap]),
					EditorView.lineWrapping,
					markdown({ base: markdownLanguage, extensions: [GFM], codeLanguages: languages }),
					mdStylePlugin,
					mdCodePlugin,
					mdPairPlugin,
					markCompartment.of(makeMarkPlugins(settingsService.markdownMarks)),
					noteEditorTheme,
					EditorView.updateListener.of((u) => {
						if (!u.docChanged) return;
						clearTimeout(saveTimer);
						const val = u.state.doc.toString();
						saveTimer = setTimeout(async () => {
							await notesService.update(noteId, val);
						}, 500);
					})
				],
				parent: editorEl
			});

			editorView = view;
			view.focus();

			return () => {
				clearTimeout(saveTimer);
				editorView = null;
				view.destroy();
			};
		});
	}
</script>

<div {@attach mount} class="relative flex h-full flex-col overflow-hidden">
	<div data-editor class="mx-auto w-full max-w-xl min-w-0 flex-1 overflow-hidden"></div>

	<div class="absolute top-5 right-5 -translate-y-1/2">
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
					Delete
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</div>

<Sheet.Root bind:open={confirmOpen}>
	<Sheet.Content side="right" class="w-full sm:max-w-md">
		<Sheet.Header class="gap-2 border-b p-6">
			<Sheet.Title>Delete note</Sheet.Title>
			<Sheet.Description>
				This will permanently delete this note. This action cannot be undone.
			</Sheet.Description>
		</Sheet.Header>
		<div class="flex justify-end gap-2 p-6">
			<Button type="button" variant="outline" onclick={() => (confirmOpen = false)}>Cancel</Button>
			<Button
				type="button"
				variant="destructive"
				onclick={async () => {
					await notesService.delete(note.id);
					confirmOpen = false;
				}}>Delete</Button
			>
		</div>
	</Sheet.Content>
</Sheet.Root>
