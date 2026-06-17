import { toast } from 'svelte-sonner';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

/** Human-readable message from an unknown caught value, for toast descriptions. */
export function errorMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

class ToasterService {
	show(severity: ToastSeverity, title: string, message?: string): void {
		toast[severity](title, message ? { description: message } : undefined);
	}

	success(title: string, message?: string): void {
		this.show('success', title, message);
	}

	error(title: string, message?: string): void {
		this.show('error', title, message);
	}

	warning(title: string, message?: string): void {
		this.show('warning', title, message);
	}

	info(title: string, message?: string): void {
		this.show('info', title, message);
	}
}

export const toasterService = new ToasterService();
