import {
	autocompletion,
	type CompletionContext,
	type CompletionResult,
	type CompletionSource
} from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { tagsService } from '$lib/services/tags.svelte';
import { tagDisplayName } from '$lib/domain/tag';

function tagCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/#[a-zA-Z0-9/]*/);
	if (!word || (word.from === word.to && !context.explicit)) return null;

	return {
		from: word.from,
		options: tagsService.tags.map((t) => ({
			label: `#${t.tag}`,
			displayLabel: tagDisplayName(t),
			type: 'keyword'
		}))
	};
}

/** The editor's single autocompletion instance. `override` only honours the
 *  first config it sees, so extra sources have to be merged in here rather than
 *  added as a second `autocompletion()` extension. */
export function mdCompletion(extra: readonly CompletionSource[] = []): Extension {
	return autocompletion({ override: [tagCompletions, ...extra] });
}
