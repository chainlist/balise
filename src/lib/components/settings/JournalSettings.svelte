<script lang="ts">
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { Switch } from 'bits-ui';
	import * as m from '$paraglide/messages.js';
	import SettingsSection from './SettingsSection.svelte';
	import SettingRow from './SettingRow.svelte';
</script>

<SettingsSection
	title={m.settings_journal_heading()}
	description={m.settings_journal_description()}
>
	<SettingRow
		title={m.settings_journal_collapse_label()}
		description={m.settings_journal_collapse_helper()}
	>
		<Switch.Root
			checked={settingsService.journal.state.collapseByDefault}
			onCheckedChange={(checked) => settingsService.journal.setCollapseByDefault(checked)}
			aria-label={m.settings_journal_collapse_label()}
			class="inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-container-highest"
		>
			<Switch.Thumb
				class="pointer-events-none block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
			/>
		</Switch.Root>
	</SettingRow>
</SettingsSection>
