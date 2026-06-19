<script lang="ts" module>
	import type { FormatMark } from '$lib/utils/cm/formatPlugin';

	export interface ToolbarAnchor {
		/** Horizontal center of the selection, in viewport coordinates. */
		left: number;
		/** Top edge of the selection (toolbar sits above this). */
		top: number;
		/** Bottom edge of the selection (toolbar flips below this near the viewport top). */
		bottom: number;
	}

	export type ActiveMarks = Record<FormatMark, boolean>;

	export interface TextToolbarControls {
		show(anchor: ToolbarAnchor, active: ActiveMarks): void;
		hide(): void;
	}
</script>

<script lang="ts">
	import { Bold, Italic, Underline, Strikethrough } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import * as m from '$paraglide/messages.js';
	import type { FormatMark } from '$lib/utils/cm/formatPlugin';

	let {
		controls,
		oncommand
	}: {
		controls: TextToolbarControls;
		oncommand: (mark: FormatMark) => void;
	} = $props();

	let visible = $state(false);
	let anchor = $state<ToolbarAnchor>({ left: 0, top: 0, bottom: 0 });
	let active = $state<ActiveMarks>({ bold: false, italic: false, underline: false, strike: false });

	// The editor's toolbar plugin drives this component imperatively through
	// `controls` (same bridge pattern as SlashMenu); the plugin flushes effects
	// after mount so these are populated before the first call.
	$effect(() => {
		controls.show = (a, marks) => {
			anchor = a;
			active = marks;
			visible = true;
		};
		controls.hide = () => {
			visible = false;
		};
	});

	const GAP = 8;
	const buttons: { mark: FormatMark; icon: typeof Bold; label: () => string }[] = [
		{ mark: 'bold', icon: Bold, label: m.editor_format_bold },
		{ mark: 'italic', icon: Italic, label: m.editor_format_italic },
		{ mark: 'underline', icon: Underline, label: m.editor_format_underline },
		{ mark: 'strike', icon: Strikethrough, label: m.editor_format_strikethrough }
	];

	// Flip below the selection when there isn't room above it.
	const below = $derived(anchor.top < 64);
	const left = $derived(Math.min(Math.max(anchor.left, 72), window.innerWidth - 72));
	const top = $derived(below ? anchor.bottom + GAP : anchor.top - GAP);
</script>

{#if visible}
	<div
		role="toolbar"
		tabindex="-1"
		class="frost-surface! fixed z-50 flex items-center gap-0.5 rounded p-1 select-none"
		style="left: {left}px; top: {top}px; transform: translate(-50%, {below ? '0' : '-100%'});"
		transition:fade={{ duration: 100 }}
		onmousedown={(e) => e.preventDefault()}
	>
		{#each buttons as b (b.mark)}
			<button
				type="button"
				aria-label={b.label()}
				aria-pressed={active[b.mark]}
				class="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				class:bg-accent={active[b.mark]}
				class:text-foreground={active[b.mark]}
				onclick={() => oncommand(b.mark)}
			>
				<b.icon class="size-4" strokeWidth={active[b.mark] ? 2.75 : 2} />
			</button>
		{/each}
	</div>
{/if}
