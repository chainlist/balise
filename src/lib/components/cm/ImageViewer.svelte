<script lang="ts">
	import { onMount } from 'svelte';
	import { fsService } from '$lib/services/fs';

	let { path }: { path: string } = $props();

	let src = $state('');
	let error = $state(false);

	onMount(() => {
		let objectUrl = '';

		const load = async () => {
			if (path.startsWith('http://') || path.startsWith('https://')) {
				src = path;
				return;
			}
			const data = await fsService.readFile(path);
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
