import type { BaliseLayoutOptions, BNode } from './interfaces';

const defaultOptions: BaliseLayoutOptions = {
	direction: 'DOWN',
	branchSpacing: 0,
	layerSpacing: 50,
	nodeSpacing: 20
};

export class BaliseLayout {
	private options: BaliseLayoutOptions = defaultOptions;
	private nodes = new Map<string, BNode>();

	constructor(options: Partial<BaliseLayoutOptions>) {
		this.options = { ...this.options, ...options };
	}

	// ==== Private Methods ====

	private _getRootNodes() {
		const childNodeIds = new Set<string>();
		this.nodes.forEach((node) => {
			node.children.forEach((childId) => childNodeIds.add(childId));
		});

		const rootNodes = Array.from(this.nodes.values()).filter((node) => !childNodeIds.has(node.id));

		return rootNodes;
	}

	private _setPosition(node: BNode, mainOffset: number, crossOffset: number) {
		const x = node.position?.x || 0;
		const y = node.position?.y || 0;
		switch (this.options.direction) {
			case 'DOWN':
				node.position = { x: 0 + x + crossOffset, y: 0 + y + mainOffset };
				break;
			case 'UP':
				node.position = { x: 0 + x + crossOffset, y: 0 + y - mainOffset };
				break;
			case 'LEFT':
				node.position = { x: 0 + x - mainOffset - node.width, y: 0 + y + crossOffset };
				break;
			case 'RIGHT':
				node.position = { x: 0 + x + mainOffset, y: 0 + y + crossOffset };
				break;
		}
	}

	private _getMainSize(node: BNode) {
		switch (this.options.direction) {
			case 'DOWN':
			case 'UP':
				return node.height;
			case 'LEFT':
			case 'RIGHT':
				return node.width;
		}
	}

	private _getCrossSize(node: BNode) {
		switch (this.options.direction) {
			case 'DOWN':
			case 'UP':
				return node.width;
			case 'LEFT':
			case 'RIGHT':
				return node.height;
		}

		return this.options.direction === 'DOWN' || this.options.direction === 'UP'
			? node.width
			: node.height;
	}

	private _getMainOffset(root: BNode, node: BNode) {
		switch (this.options.direction) {
			case 'UP':
				return this._getMainSize(node) + this.options.layerSpacing;
			default:
				return this._getMainSize(root) + this.options.layerSpacing;
		}
	}

	private _layoutSubtree(node: BNode, depth = 0, mainOffset = 0, crossOffset = 0) {
		const box = {
			main: mainOffset,
			cross: crossOffset
		};

		this._setPosition(node, box.main, box.cross);

		const offset = { main: 0, cross: crossOffset };
		node.children.forEach((childId) => {
			const child = this.nodes.get(childId);
			if (!child) return;

			const childOffset = this._layoutSubtree(
				child,
				depth,
				this._getMainOffset(node, child),
				offset.cross
			);

			offset.cross += this._getCrossSize(child) + this.options.nodeSpacing;
		});

		return offset;
	}

	private _applyRealPositions(node: BNode, offsetX = 0, offsetY = 0) {
		if (node.fixed) return;

		node.position!.x += offsetX;
		node.position!.y += offsetY;

		node.children.forEach((childId) => {
			const child = this.nodes.get(childId);
			if (!child) return;
			this._applyRealPositions(child, node.position?.x, node.position?.y);
		});
	}

	// ==== Public Methods ====

	addNode(id: string, node: Omit<BNode, 'children'>) {
		(node as BNode).children = [];
		this.nodes.set(id, node as BNode);
	}

	addEdge(source: string, target: string) {
		if (!this.nodes.has(source) || !this.nodes.has(target)) {
			throw new Error('Source or target node does not exist');
		}

		const parentNode = this.nodes.get(source);

		parentNode?.children.push(target);
	}

	layout(): BNode[] {
		const rootNodes = this._getRootNodes();

		rootNodes.forEach((root) => {
			this._layoutSubtree(root);
		});

		rootNodes.forEach((root) => {
			this._applyRealPositions(root);
		});

		return Array.from(this.nodes.values());
	}
}

export function useBaliseLayout(options: Partial<BaliseLayoutOptions> = {}) {
	return new BaliseLayout(options);
}
