<script lang="ts">
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import * as m from '$paraglide/messages.js';
	import SettingsSection from './SettingsSection.svelte';
	import ColorSettingRow from './ColorSettingRow.svelte';

	const headings = [
		{ level: 1, title: m.settings_editor_h1_label, aria: m.settings_editor_h1_aria },
		{ level: 2, title: m.settings_editor_h2_label, aria: m.settings_editor_h2_aria },
		{ level: 3, title: m.settings_editor_h3_label, aria: m.settings_editor_h3_aria },
		{ level: 4, title: m.settings_editor_h4_label, aria: m.settings_editor_h4_aria }
	] as const;
</script>

<SettingsSection
	title={m.settings_editor_colors_label()}
	description={m.settings_editor_colors_helper()}
	bodyClass="space-y-4"
>
	{#each headings as heading (heading.level)}
		<ColorSettingRow
			title={heading.title()}
			description={m.settings_editor_heading_color_helper()}
			ariaLabel={heading.aria()}
			value={settingsService.editor.state[`heading${heading.level}Color`]}
			defaultClass="bg-primary"
			onpick={(color) => settingsService.editor.setHeadingColor(heading.level, color)}
			onreset={() => settingsService.editor.setHeadingColor(heading.level, null)}
		/>
	{/each}

	<ColorSettingRow
		title={m.settings_editor_text_label()}
		description={m.settings_editor_text_helper()}
		ariaLabel={m.settings_editor_text_aria()}
		value={settingsService.editor.state.textColor}
		defaultClass="bg-foreground"
		onpick={(color) => settingsService.editor.setTextColor(color)}
		onreset={() => settingsService.editor.setTextColor(null)}
	/>
</SettingsSection>
