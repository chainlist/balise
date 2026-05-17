<script lang="ts">
	import { EditorView, keymap } from '@codemirror/view';
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
		mdPairPlugin,
		mdFormatPlugin,
		mdLinkPlugin,
		noteEditorTheme
	} from '$lib/utils/cm';
	import { updateNote, deleteNote, type Note } from '$lib/services/notes.svelte';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import * as Sheet from '$lib/components/shadcn/sheet/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { EllipsisVerticalIcon, Trash2Icon } from '@lucide/svelte';

	let confirmOpen = $state(false);

	let { note }: { note: Note } = $props();

	function mount(container: HTMLDivElement) {
		return untrack(() => {
			const statusEl = container.querySelector<HTMLSpanElement>('[data-save-status]')!;
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
					mdHidePlugin,
					mdCodePlugin,
					mdLinkPlugin,
					mdTagPlugin,
					mdPairPlugin,
					noteEditorTheme,
					EditorView.updateListener.of((u) => {
						if (u.docChanged) {
							clearTimeout(saveTimer);
							statusEl.textContent = 'Saving…';
							const val = u.state.doc.toString();
							saveTimer = setTimeout(async () => {
								await updateNote(noteId, val);
								statusEl.textContent = 'Saved';
							}, 500);
						}
					})
				],
				parent: editorEl
			});

			view.focus();

			return () => {
				clearTimeout(saveTimer);
				view.destroy();
			};
		});
	}
</script>

<div {@attach mount} class="relative flex h-full flex-col overflow-hidden">
	<div class="flex shrink-0 items-center border-b px-4 py-2">
		<span data-save-status class="text-xs text-muted-foreground">Saved</span>
	</div>
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
			<Sheet.Description
				>This will permanently delete this note. This action cannot be undone.</Sheet.Description
			>
		</Sheet.Header>
		<div class="flex justify-end gap-2 p-6">
			<Button type="button" variant="outline" onclick={() => (confirmOpen = false)}>Cancel</Button>
			<Button
				type="button"
				variant="destructive"
				onclick={() => {
					deleteNote(note.id);
					confirmOpen = false;
				}}>Delete</Button
			>
		</div>
	</Sheet.Content>
</Sheet.Root>
