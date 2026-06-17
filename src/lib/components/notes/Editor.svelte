<script lang="ts">
	import { EditorView, keymap } from '@codemirror/view';
	import { Compartment } from '@codemirror/state';
	import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
	import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
	import { GFM } from '@lezer/markdown';
	import { languages } from '@codemirror/language-data';
	import {
		codeFolding,
		foldGutter,
		foldKeymap,
		foldNodeProp,
		foldEffect,
		unfoldEffect
	} from '@codemirror/language';
	import { untrack } from 'svelte';
	import { closeBrackets, completionKeymap } from '@codemirror/autocomplete';
	import {
		mdSyntaxHighlighting,
		mdHidePlugin,
		mdBulletPlugin,
		mdHrPlugin,
		mdHeaderPlugin,
		mdQuotePlugin,
		quoteExitKeymap,
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
		spaceRequiredHeadings,
		noteEditorTheme,
		readFolds,
		restoreFolds,
		type MarkMode,
		type FoldRange
	} from '$lib/utils/cm';
	import { settingsService } from '$lib/services/settings/settings.svelte';

	let {
		content,
		autofocus = false,
		initialFolds = [],
		onchange,
		onfoldchange,
		onfocus,
		onblur
	}: {
		content: string;
		autofocus?: boolean;
		initialFolds?: FoldRange[];
		onchange?: (val: string) => void;
		onfoldchange?: (folds: FoldRange[]) => void;
		onfocus?: () => void;
		onblur?: () => void;
	} = $props();

	let editorView = $state<EditorView | null>(null);
	let focused = $state(false);
	// Serialised last-reported folds, so we only emit when the set actually changes
	// (a doc edit that shifts a fold's offsets counts; typing elsewhere doesn't).
	let lastFoldKey = '';
	const markCompartment = new Compartment();

	function makeMarkPlugins(mode: MarkMode) {
		return [
			mdHidePlugin(mode),
			mdMarkNavPlugin(mode),
			mdCodePlugin(mode),
			mdBulletPlugin(mode),
			mdHrPlugin(mode),
			mdHeaderPlugin(mode),
			mdQuotePlugin(mode),
			mdHighlightPlugin(mode),
			mdLinkPlugin(mode),
			mdTagPlugin(mode),
			mdCheckboxPlugin(mode),
			mdTaskTagPlugin(mode)
		];
	}

	$effect(() => {
		const mode = settingsService.editor.state.markdownMarks;
		const effectiveMode: MarkMode = mode === 'cursor' && !focused ? 'never' : mode;
		if (editorView) {
			editorView.dispatch({ effects: markCompartment.reconfigure(makeMarkPlugins(effectiveMode)) });
		}
	});

	function mount(container: HTMLDivElement) {
		return untrack(() => {
			const view = new EditorView({
				doc: content,
				extensions: [
					// Core
					history(),
					EditorView.lineWrapping,
					// Language / syntax
					markdown({
						base: markdownLanguage,
						extensions: [
							GFM,
							spaceRequiredHeadings,
							{ props: [foldNodeProp.add({ Paragraph: () => null })] }
						],
						codeLanguages: languages
					}),
					mdSyntaxHighlighting,
					codeFolding(),
					foldGutter(),
					// Keybindings
					mdFormatPlugin,
					quoteExitKeymap,
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
					// Images always render as widgets, independent of mark mode
					mdImagePlugin(),
					// Mark visibility (dynamically reconfigured)
					markCompartment.of(makeMarkPlugins(settingsService.editor.state.markdownMarks)),
					// Theme
					noteEditorTheme,
					// Focus + change listener
					EditorView.updateListener.of((u) => {
						if (u.focusChanged) {
							if (u.view.hasFocus) {
								focused = true;
								onfocus?.();
							} else {
								focused = false;
								onblur?.();
							}
						}
						if (u.docChanged) {
							onchange?.(u.state.doc.toString());
						}
						const foldsTouched = u.transactions.some((tr) =>
							tr.effects.some((e) => e.is(foldEffect) || e.is(unfoldEffect))
						);
						if (foldsTouched || u.docChanged) {
							const folds = readFolds(u.state);
							const key = JSON.stringify(folds);
							if (key !== lastFoldKey) {
								lastFoldKey = key;
								onfoldchange?.(folds);
							}
						}
					})
				],
				parent: container
			});

			editorView = view;
			// Seed the dedupe key with what we're about to restore so re-applying the
			// saved folds doesn't immediately echo back through onfoldchange.
			lastFoldKey = JSON.stringify(initialFolds);
			restoreFolds(view, initialFolds);
			if (autofocus) view.focus();

			return () => {
				editorView = null;
				view.destroy();
			};
		});
	}
</script>

<div {@attach mount} class="mx-auto w-full max-w-175"></div>
