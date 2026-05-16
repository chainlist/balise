<script lang="ts">
	let { lang, code }: { lang: string; code: string } = $props();
</script>

<div class="cm-md-code-block relative">
	{#if lang}
		<div class="cm-md-code-header absolute top-0 right-0">
			<span class="cm-md-code-lang text-xs!important p-1">{lang}</span>
		</div>
	{:else}
		<div class="cm-md-code-header">Unknown</div>
	{/if}
	<pre class="cm-md-code-pre"><code>{code}</code></pre>
	<!-- <div class="cm-md-code-footer"></div> -->
</div>
