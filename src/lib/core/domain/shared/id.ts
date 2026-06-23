/** Generate a new unique id. Thin, framework-free wrapper over `crypto.randomUUID`. */
export function newId(): string {
	return crypto.randomUUID();
}
