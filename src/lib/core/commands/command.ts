export interface Command {
	execute(): Promise<unknown> | unknown;
	undo?(): Promise<unknown> | unknown;
}
