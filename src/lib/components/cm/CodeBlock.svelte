<script lang="ts">
	let { lang, code }: { lang: string; code: string } = $props();
	import * as Code from '$lib/components/shadcn/code';
</script>

<div class="w-full p-6">
	<Code.Root lang={lang as any} {code} />
</div>
