import { SettingsGroup } from './base.svelte';
import type { Theme } from '../app/theme.svelte';
import { primaryColorVars, PRIMARY_COLOR_VARS } from '$lib/utils/primary-color';

/* Order matches the mesh gradients: top-left, top-right, bottom-right, bottom-left */
export type MeshColors = [string, string, string, string];
/* Per-corner bubble scale factors, same order as MeshColors */
export type MeshSizes = [number, number, number, number];

export const MESH_MODES = {
	CORNERS: 'corners',
	UNIFIED: 'unified'
} as const;

export type MeshMode = (typeof MESH_MODES)[keyof typeof MESH_MODES];

export const DEFAULT_MESH_COLORS: MeshColors = ['#7c6cde', '#7c6cde', '#7c6cde', '#7c6cde'];
export const DEFAULT_MESH_SIZES: MeshSizes = [1, 1.9, 1.7, 1];
export const DEFAULT_MESH_UNIFIED_COLOR = '#7c6cde';

const MESH_CSS_VARS = ['--mesh-tl', '--mesh-tr', '--mesh-br', '--mesh-bl'] as const;
const MESH_SIZE_CSS_VARS = [
	'--mesh-tl-size',
	'--mesh-tr-size',
	'--mesh-br-size',
	'--mesh-bl-size'
] as const;

export interface AppearanceSettings {
	theme: Theme;
	primaryColor: string | null;
	meshColors: MeshColors;
	meshSizes: MeshSizes;
	meshMode: MeshMode;
	meshUnifiedColor: string;
	meshEnabled: boolean;
}

export class AppearanceSettingsService extends SettingsGroup<AppearanceSettings> {
	readonly key = 'appearance';
	state = $state<AppearanceSettings>({
		theme: 'system',
		primaryColor: null,
		meshColors: [...DEFAULT_MESH_COLORS],
		meshSizes: [...DEFAULT_MESH_SIZES],
		meshMode: MESH_MODES.CORNERS,
		meshUnifiedColor: DEFAULT_MESH_UNIFIED_COLOR,
		meshEnabled: true
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
		void this.store.onKeyChange<AppearanceSettings>('appearance', (appearance) => {
			this.state.theme = appearance?.theme ?? 'system';
		});
	}
}
