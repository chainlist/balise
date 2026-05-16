<script lang="ts">
	let { href, label }: { href: string; label: string } = $props();

	import { openUrl } from '@tauri-apps/plugin-opener';
</script>

<a
	class="cm-md-link cursor-pointer select-none"
	// eslint-disable-next-line svelte/no-navigation-without-resolve
	{href}
	onclick={(e) => {
		e.preventDefault();
		openUrl(href);
	}}
>
	{label}
</a>
