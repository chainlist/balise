import type { Snippet } from 'svelte';

/**
 * The top navbar's center slot. The active note's header fills it with the
 * note's date and reading time while it is mounted, and clears it on unmount
 * (no note open, zen mode, or the journal's stacked editors). Lives in shared
 * state because the navbar renders in the layout, above the page that owns the
 * data, so the content can't be passed down as a prop.
 */
class NavbarState {
	center = $state<Snippet | null>(null);

	/** When true, the slot content is made click-through so the drag region
	 *  behind it still moves the window. Set this for non-interactive content
	 *  (plain text); leave it false when the slot holds buttons or links. */
	grabbable = $state(false);
}

export const navbarState = new NavbarState();
