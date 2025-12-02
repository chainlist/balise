export interface BaliseLayoutOptions {
	direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
	branchSpacing: number;
	layerSpacing: number;
	nodeSpacing: number;
}

export interface XYPosition {
	x: number;
	y: number;
}

export interface BNode {
	id: string;
	position?: XYPosition;
	width: number;
	height: number;
	fixed?: boolean;

	children: string[];
}
