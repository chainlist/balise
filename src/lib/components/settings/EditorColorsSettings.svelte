<script lang="ts">
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import * as m from '$paraglide/messages.js';
	import SettingsSection from './SettingsSection.svelte';
	import ColorSettingRow from './ColorSettingRow.svelte';
	import HeadingColorRow from './HeadingColorRow.svelte';

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
	bodyClass="space-y-6"
>
	{#each headings as heading (heading.level)}
		<HeadingColorRow
			level={heading.level}
			title={heading.title()}
			ariaLabel={heading.aria()}
			value={settingsService.editor.state[`heading${heading.level}Color`]}
			underline={settingsService.editor.state[`heading${heading.level}Underline`]}
			onpick={(color) => settingsService.editor.setHeadingColor(heading.level, color)}
			onreset={() => settingsService.editor.setHeadingColor(heading.level, null)}
			onToggleUnderline={(value) =>
				settingsService.editor.setHeadingUnderline(heading.level, value)}
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
