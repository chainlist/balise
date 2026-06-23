import { SettingsSection } from './base.svelte';
import { settingsRepo } from '$lib/repositories/settings.repo';
import {
	MESH_MODES,
	DEFAULT_MESH_COLORS,
	DEFAULT_MESH_SIZES,
	DEFAULT_MESH_UNIFIED_COLOR,
	DEFAULT_APPEARANCE_SETTINGS,
	type AppearanceSettings,
	type MeshMode,
	type Theme
} from '$lib/domain/settings';
import { primaryColorVars, PRIMARY_COLOR_VARS } from '$lib/domain/theme';

// NOTE: the `apply*Vars` methods below write CSS variables to `document`, an
// app-shell/presentation concern. The pure CSS-var computation now lives in
// `domain/theme` (Concept 08); the DOM writes stay here as the appearance
// section's apply step, mirroring how the theme service owns the root `dark` class.

const MESH_CSS_VARS = ['--mesh-tl', '--mesh-tr', '--mesh-br', '--mesh-bl'] as const;
const MESH_SIZE_CSS_VARS = [
	'--mesh-tl-size',
	'--mesh-tr-size',
	'--mesh-br-size',
	'--mesh-bl-size'
] as const;

export class AppearanceSettingsSection extends SettingsSection<AppearanceSettings> {
	readonly key = 'appearance';
	state = $state<AppearanceSettings>({
		...DEFAULT_APPEARANCE_SETTINGS,
		meshColors: [...DEFAULT_MESH_COLORS],
		meshSizes: [...DEFAULT_MESH_SIZES]
	});

	setTheme(theme: Theme): void {
		this.state.theme = theme;
		this.persist();
	}

	setMeshColor(corner: number, color: string): void {
		this.state.meshColors[corner] = color;
		this.applyMeshVars();
		this.persist();
	}

	setMeshSize(corner: number, size: number): void {
		this.state.meshSizes[corner] = size;
		this.applyMeshVars();
		this.persist();
	}

	setMeshMode(mode: MeshMode): void {
		this.state.meshMode = mode;
		this.applyMeshVars();
		this.persist();
	}

	setMeshUnifiedColor(color: string): void {
		this.state.meshUnifiedColor = color;
		this.applyMeshVars();
		this.persist();
	}

	resetMesh(): void {
		this.state.meshMode = MESH_MODES.CORNERS;
		this.state.meshColors = [...DEFAULT_MESH_COLORS];
		this.state.meshSizes = [...DEFAULT_MESH_SIZES];
		this.state.meshUnifiedColor = DEFAULT_MESH_UNIFIED_COLOR;
		this.applyMeshVars();
		this.persist();
	}

	setMeshEnabled(value: boolean): void {
		this.state.meshEnabled = value;
		this.applyMeshVars();
		this.persist();
	}

	setPrimaryColor(color: string): void {
		this.state.primaryColor = color;
		this.applyPrimaryVars();
		this.persist();
	}

	resetPrimaryColor(): void {
		this.state.primaryColor = null;
		this.applyPrimaryVars();
		this.persist();
	}

	/** Re-apply all appearance-driven CSS vars (called after load). */
	apply(): void {
		this.applyMeshVars();
		this.applyPrimaryVars();
	}

	applyMeshVars(): void {
		const style = document.documentElement.style;
		const { meshEnabled, meshMode, meshColors, meshSizes, meshUnifiedColor } = this.state;
		const cornersVisible = meshEnabled && meshMode === MESH_MODES.CORNERS;
		MESH_CSS_VARS.forEach((cssVar, i) => {
			style.setProperty(cssVar, cornersVisible ? meshColors[i] : 'transparent');
		});
		MESH_SIZE_CSS_VARS.forEach((cssVar, i) => {
			style.setProperty(cssVar, `${meshSizes[i]}`);
		});
		style.setProperty(
			'--mesh-unified',
			meshEnabled && meshMode === MESH_MODES.UNIFIED ? meshUnifiedColor : 'transparent'
		);
	}

	applyPrimaryVars(): void {
		const style = document.documentElement.style;
		if (this.state.primaryColor) {
			Object.entries(primaryColorVars(this.state.primaryColor)).forEach(([name, value]) => {
				style.setProperty(name, value);
			});
		} else {
			PRIMARY_COLOR_VARS.forEach((name) => style.removeProperty(name));
		}
	}

	/** Keep theme in sync across windows (main <-> quick add). */
	watchCrossWindow(): void {
		void settingsRepo.onSectionChange<AppearanceSettings>('appearance', (appearance) => {
			this.state.theme = appearance?.theme ?? 'system';
		});
	}
}
