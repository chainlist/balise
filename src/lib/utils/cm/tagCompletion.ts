import {
	autocompletion,
	type CompletionContext,
	type CompletionResult
} from '@codemirror/autocomplete';
import { tagsService } from '$lib/core/services/tags.svelte';
import { tagDisplayName } from '$lib/core/domain/tag';

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

export const mdTagCompletion = autocompletion({ override: [tagCompletions] });
