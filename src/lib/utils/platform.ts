// Coarse OS detection for window-chrome decisions (where the window controls
// live, whether macOS draws native traffic lights). The app is client-only
// (SSR disabled), so `navigator` is always present at module load.
export const isMac =
	typeof navigator !== 'undefined' &&
	(navigator.platform.includes('Mac') || navigator.userAgent.includes('Mac'));
