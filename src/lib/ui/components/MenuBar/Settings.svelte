<script lang="ts">
	import * as MenuBar from '$lib/ui/components/shadcn/menubar/index.js';
	import { useRefresh } from '$lib/core/commands/list/refresh.command';
	import { useState } from '$lib/states/index.svelte';

	const { settings } = useState();

	function onValueChange() {
		useRefresh({ fitView: true });
	}
</script>

<MenuBar.Menu>
	<MenuBar.Trigger>Settings</MenuBar.Trigger>
	<MenuBar.Content class="w-56" align="start">
		<MenuBar.Sub>
			<MenuBar.SubTrigger>Display mode</MenuBar.SubTrigger>
			<MenuBar.SubContent>
				<MenuBar.RadioGroup bind:value={settings.ui.displayMode} {onValueChange}>
					<MenuBar.RadioItem value="mindmap">Mindmap</MenuBar.RadioItem>
					<MenuBar.RadioItem value="list">List</MenuBar.RadioItem>
					<MenuBar.RadioItem value="both">Both</MenuBar.RadioItem>
				</MenuBar.RadioGroup>
			</MenuBar.SubContent>
		</MenuBar.Sub>
		<MenuBar.Label>Mindmap</MenuBar.Label>
		<MenuBar.Sub>
			<MenuBar.Item disabled>New Mindmap <MenuBar.Shortcut>Ctrl+N</MenuBar.Shortcut></MenuBar.Item>
			<MenuBar.Separator />
			<MenuBar.SubTrigger>Layouts</MenuBar.SubTrigger>
			<MenuBar.SubContent>
				<MenuBar.RadioGroup bind:value={settings.mindmap.layout} {onValueChange}>
					<MenuBar.RadioItem value="balise">Balise</MenuBar.RadioItem>
					<MenuBar.RadioItem value="dagre">Dagre</MenuBar.RadioItem>
					<MenuBar.RadioItem value="mrtree">Mrtree</MenuBar.RadioItem>
				</MenuBar.RadioGroup>
			</MenuBar.SubContent>
		</MenuBar.Sub>
		<MenuBar.Sub>
			<MenuBar.SubTrigger>Direction</MenuBar.SubTrigger>
			<MenuBar.SubContent>
				<MenuBar.RadioGroup bind:value={settings.mindmap.direction} {onValueChange}>
					<MenuBar.RadioItem value="UP">Up</MenuBar.RadioItem>
					<MenuBar.RadioItem value="DOWN">Down</MenuBar.RadioItem>
					<MenuBar.RadioItem value="LEFT">Left</MenuBar.RadioItem>
					<MenuBar.RadioItem value="RIGHT">Right</MenuBar.RadioItem>
				</MenuBar.RadioGroup>
			</MenuBar.SubContent>
		</MenuBar.Sub>
		<MenuBar.Separator />
		<MenuBar.Label>List</MenuBar.Label>
		<MenuBar.Item>Theme</MenuBar.Item>
		<MenuBar.Separator />
		<MenuBar.Item>Open Settings <MenuBar.Shortcut>Ctrl+,</MenuBar.Shortcut></MenuBar.Item>
		<MenuBar.Separator />
		<MenuBar.Item variant="destructive">Delete Mindmap</MenuBar.Item>
	</MenuBar.Content>
</MenuBar.Menu>
