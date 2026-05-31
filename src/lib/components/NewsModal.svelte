<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { uiState } from '$lib/services/ui-state.svelte';
	import Button from '$lib/components/shadcn/button/button.svelte';
	import * as m from '$paraglide/messages.js';

	function close() {
		uiState.isNewsOpen = false;
		uiState.setLastSeenVersion(uiState.newsVersion);
	}
</script>

<DialogPrimitive.Root
	open={uiState.isNewsOpen}
	onOpenChange={(v) => {
		if (!v) close();
	}}
>
	<DialogPrimitive.Portal>
		<DialogPrimitive.Overlay
			class="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
		/>
		<DialogPrimitive.Content
			class="fixed top-1/2 left-1/2 z-50 flex max-h-[80vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 scrollbar-none flex-col rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
		>
			<div class="flex-1 overflow-y-auto p-8">
				<div class="prose prose-sm max-w-none dark:prose-invert">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html uiState.newsContent}
				</div>
			</div>
			<div class="flex shrink-0 justify-end border-t px-8 py-4">
				<Button onclick={close}>{m.news_got_it()}</Button>
			</div>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
