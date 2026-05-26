<script lang="ts">
	import { onMount } from 'svelte';
	import { BaseDirectory, readFile } from '@tauri-apps/plugin-fs';
	import { DESKS_ROOT_DIR, sanitizeDeskName } from '$lib/services/desk';

	let { path, deskName }: { path: string; deskName: string } = $props();

	let src = $state('');
	let error = $state(false);

	onMount(() => {
		let objectUrl = '';

		const load = async () => {
			if (path.startsWith('http://') || path.startsWith('https://')) {
				src = path;
				return;
			}
			const safeDesk = sanitizeDeskName(deskName);
			const data = await readFile(`${DESKS_ROOT_DIR}/${safeDesk}/${path}`, {
				baseDir: BaseDirectory.Document
			});
			objectUrl = URL.createObjectURL(new Blob([data]));
			src = objectUrl;
		};

		load().catch(() => {
			error = true;
		});

		return () => {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	});
</script>

<div class="grid w-full place-items-center">
	{#if src}
		<img {src} alt="" class="my-1 max-h-96 max-w-full rounded" />
	{:else if error}
		<span class="text-sm text-muted-foreground italic">Image not found</span>
	{/if}
</div>
