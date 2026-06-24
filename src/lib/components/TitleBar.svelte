<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { Minus, X, Square } from '@lucide/svelte';
	import { isMac } from '$lib/utils/platform';
	import { navbarState } from '$lib/services/navbar.svelte';

	const win = getCurrentWindow();
</script>

<!-- Title-bar strip for the content panel: the empty area is a drag region so
     the window can be moved (and double-clicked to maximize). The center slot is
     filled by the active note's header (date, reading time). On Windows/Linux it
     also hosts the window controls; macOS draws native traffic lights via the
     Overlay title bar, so no buttons are rendered there. -->
<div data-tauri-drag-region class="flex h-9 w-full shrink-0 items-center select-none">
	<div data-tauri-drag-region class="flex min-w-0 flex-1 items-center justify-center">
		{#if navbarState.center}
			<div class:pointer-events-none={navbarState.grabbable}>
				{@render navbarState.center()}
			</div>
		{/if}
	</div>
	{#if !isMac}
		<div class="flex shrink-0">
			<button
				onclick={() => void win.minimize()}
				aria-label="Minimize"
				class="flex h-9 w-11 items-center justify-center text-foreground/50 transition-colors hover:bg-muted hover:text-black focus:outline-none"
			>
				<Minus class="size-3.5" />
			</button>
			<button
				onclick={() => void win.toggleMaximize()}
				aria-label="Maximize"
				class="flex h-9 w-11 items-center justify-center text-foreground/50 transition-colors hover:bg-muted hover:text-black focus:outline-none"
			>
				<Square class="size-3.5" />
			</button>
			<button
				onclick={() => void win.close()}
				aria-label="Close"
				class="flex h-9 w-11 items-center justify-center text-foreground/50 transition-colors hover:bg-[#ba1a1a] hover:text-white focus:outline-none"
			>
				<X class="size-3.5" />
			</button>
		</div>
	{/if}
</div>
