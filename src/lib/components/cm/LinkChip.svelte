<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { LinkPreview } from 'bits-ui';
	import { Maximize2 } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import OgCard from './OgCard.svelte';

	let {
		href,
		label,
		canEmbed = false,
		onEmbed
	}: { href: string; label: string; canEmbed?: boolean; onEmbed?: () => void } = $props();

	// Only http(s) links get a preview; other schemes (mailto:, relative, …)
	// render as a plain link.
	const isHttp = $derived(/^https?:\/\//.test(href));

	function onClick(event: MouseEvent) {
		event.preventDefault();
		openUrl(href);
	}
</script>

<span class="relative" class:group={canEmbed}>
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
	{#if canEmbed}
		<button
			type="button"
			onclick={onEmbed}
			aria-label={m.embed_show_as_embed()}
			class="absolute top-1/2 left-full ml-1 -translate-y-1/2 rounded bg-background/70 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
		>
			<Maximize2 class="size-3.5" />
		</button>
	{/if}
</span>
