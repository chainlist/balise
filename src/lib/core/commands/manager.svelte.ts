import type { Command } from './command';

export class CommandManager {
	history = $state<Command[]>([]);
	currIndex = $state<number>(-1);

	execute<T extends Command>(command: T): Promise<Awaited<ReturnType<T['execute']>>> | void;
	execute(command: Command): Promise<Awaited<ReturnType<Command['execute']>>>;
	async execute(command: Command): Promise<unknown> {
		const result = command.execute();

		if (!('undo' in command)) return result;

		if (this.currIndex < this.history.length - 1) {
			this.history = this.history.slice(0, this.currIndex + 1);
		}

		this.history.push(command);
		this.currIndex++;

		return result;
	}

	undo(): Promise<void> | void {
		if (this.currIndex >= 0) {
			const command = this.history[this.currIndex];
			command.undo?.();
			this.currIndex--;
		}
	}

	redo(): Promise<void> | void {
		if (this.currIndex < this.history.length - 1) {
			const command = this.history[this.currIndex + 1];
			command.execute();
			this.currIndex++;
		}
	}

	clear(): void {
		this.history = [];
		this.currIndex = -1;
	}
}

const commandManager = new CommandManager();

export function useCommandManager() {
	return commandManager;
}

export function useExecuteCommand(command: Command) {
	const mngr = useCommandManager();
	return mngr.execute(command);
}

export function useUndoCommand() {
	const mngr = useCommandManager();
	return mngr.undo();
}

export function useRedoCommand() {
	const mngr = useCommandManager();
	return mngr.redo();
}
