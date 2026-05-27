<script lang="ts">
	let { lang, code }: { lang: string; code: string } = $props();
	import * as Code from '$lib/components/shadcn/code';
</script>

<div class="flex w-full overflow-x-auto rounded border bg-white/50 p-6 font-mono dark:bg-white/10">
	{code}
</div>
