import {
	autocompletion,
	type CompletionContext,
	type CompletionResult
} from '@codemirror/autocomplete';
import { tagDisplayName, tagsService } from '$lib/services/content/tags.svelte';

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
