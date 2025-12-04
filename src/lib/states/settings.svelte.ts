import { BackgroundVariant } from '@xyflow/svelte';
import type { ColorScheme } from './color-schemes/scheme';
import balise from './color-schemes/balise';
import material from './color-schemes/material';

export interface UISettings {
	darkMode: boolean;
	debugMode: boolean;
	colorScheme: string;
	colorSchemes: Record<string, ColorScheme>;
	animationDuration: number;
	displayMode: 'mindmap' | 'list' | 'both';
}

export type MindmapDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type MindmapLayout = 'mrtree' | 'balise' | 'dagre';
export interface MindmapSettings {
	layout: MindmapLayout;
	direction: MindmapDirection;
	bgVariant: BackgroundVariant | undefined;
	minZoom: number;
}

export interface KeyboardSettings {
	// Define keyboard settings here
	bindings: Record<string, unknown>;
}

export class SettingsState {
	ui = $state<UISettings>({
		darkMode: false,
		debugMode: false,
		colorScheme: 'balise',
		colorSchemes: { balise, material },
		animationDuration: 200,
		displayMode: 'mindmap'
	});

	mindmap = $state<MindmapSettings>({
		layout: 'dagre',
		direction: 'RIGHT',
		bgVariant: undefined,
		minZoom: 0.01
	});

	keyboard = $state<KeyboardSettings>({
		bindings: {}
	});
}
