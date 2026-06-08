<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { Minus, X, Square } from '@lucide/svelte';

	const isMac = true; //typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
	const win = getCurrentWindow();
</script>

<div
	data-tauri-drag-region
	class="flex h-8 w-full shrink-0 items-center border-b border-border bg-background select-none"
>
	{#if isMac}
		<div class="ml-3 flex items-center gap-1.5">
			<button
				onclick={() => void win.close()}
				aria-label="Close"
				class="h-3 w-3 rounded-full bg-[#FF5F57] transition-opacity hover:opacity-80 focus:outline-none"
			></button>
			<button
				onclick={() => void win.minimize()}
				aria-label="Minimize"
				class="h-3 w-3 rounded-full bg-[#FFBD2E] transition-opacity hover:opacity-80 focus:outline-none"
			></button>
			<button
				onclick={() => void win.toggleMaximize()}
				aria-label="Maximize"
				class="h-3 w-3 rounded-full bg-[#28C840] transition-opacity hover:opacity-80 focus:outline-none"
			></button>
		</div>
	{:else}
		<div class="ml-auto flex">
			<button
				onclick={() => void win.minimize()}
				aria-label="Minimize"
				class="flex h-8 w-11 items-center justify-center text-foreground/50 transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
			>
				<Minus class="size-3.5" />
			</button>
			<button
				onclick={() => void win.toggleMaximize()}
				aria-label="Maximize"
				class="flex h-8 w-11 items-center justify-center text-foreground/50 transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
			>
				<Square class="size-3.5" />
			</button>
			<button
				onclick={() => void win.close()}
				aria-label="Close"
				class="hover:text-destructive-foreground flex h-8 w-11 items-center justify-center text-foreground/50 transition-colors hover:bg-destructive focus:outline-none"
			>
				<X class="size-3.5" />
			</button>
		</div>
	{/if}
</div>
