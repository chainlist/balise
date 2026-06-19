<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { LinkPreview } from 'bits-ui';
	import OgCard from './OgCard.svelte';

	let { href, label }: { href: string; label: string } = $props();

	// Only http(s) links get a preview; other schemes (mailto:, relative, …)
	// render as a plain link.
	const isHttp = $derived(/^https?:\/\//.test(href));

	function onClick(event: MouseEvent) {
		event.preventDefault();
		openUrl(href);
	}
</script>

{#if isHttp}
	<LinkPreview.Root openDelay={300} closeDelay={150}>
		<LinkPreview.Trigger>
			{#snippet child({ props })}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a {...props} class="cm-md-link cursor-pointer select-none" {href} onclick={onClick}>
					{label}
				</a>
			{/snippet}
		</LinkPreview.Trigger>
		<LinkPreview.Portal>
			<LinkPreview.Content
				sideOffset={6}
				class="z-50 w-80 origin-(--bits-floating-transform-origin) rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 outline-none dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
			>
				<OgCard url={href} {label} />
			</LinkPreview.Content>
		</LinkPreview.Portal>
	</LinkPreview.Root>
{:else}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a class="cm-md-link cursor-pointer select-none" {href} onclick={onClick}>
		{label}
	</a>
{/if}
