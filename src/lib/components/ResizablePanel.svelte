<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		storageKey,
		defaultWidth,
		minWidth,
		maxWidth = 600,
		children
	}: {
		storageKey: string;
		defaultWidth: number;
		minWidth: number;
		maxWidth?: number;
		children: Snippet;
	} = $props();

	function clamp(value: number): number {
		return Math.min(Math.max(value, minWidth), maxWidth);
	}

	function loadWidth(): number {
		const stored = Number(localStorage.getItem(storageKey));
		return Number.isFinite(stored) && stored > 0 ? clamp(stored) : defaultWidth;
	}

	let width = $state(loadWidth());
	let dragging = $state(false);

	function onpointerdown(event: PointerEvent) {
		event.preventDefault();
		const startX = event.clientX;
		const startWidth = width;
		dragging = true;
		document.body.style.userSelect = 'none';

		function onmove(e: PointerEvent) {
			width = clamp(startWidth + (e.clientX - startX));
		}
		function onup() {
			dragging = false;
			document.body.style.userSelect = '';
			localStorage.setItem(storageKey, String(width));
			window.removeEventListener('pointermove', onmove);
			window.removeEventListener('pointerup', onup);
		}
		window.addEventListener('pointermove', onmove);
		window.addEventListener('pointerup', onup);
	}
</script>

<div class="relative h-full shrink-0" style:width="{width}px">
	{@render children()}
	<div
		role="separator"
		aria-orientation="vertical"
		tabindex="-1"
		class="group absolute inset-y-0 -right-1 z-10 flex w-2 cursor-col-resize justify-center"
		{onpointerdown}
	>
		<div
			class="h-full w-px bg-border transition-colors group-hover:bg-ring"
			class:bg-ring={dragging}
		></div>
	</div>
</div>
