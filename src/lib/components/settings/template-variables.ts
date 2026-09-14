import { TEMPLATE_VARIABLES, type TemplateVariableName } from '$lib/domain/template';
import type { TemplateVariableOption } from '$lib/utils/cm';
import * as m from '$paraglide/messages.js';

// The translated one-liner shown next to each `{{name}}` suggestion. The names
// themselves belong to the domain; only their wording lives here, so a new
// variable is a compile error until it gets a description.
const DESCRIPTIONS: Record<TemplateVariableName, () => string> = {
	title: m.settings_templates_var_title,
	date: m.settings_templates_var_date,
	time: m.settings_templates_var_time,
	datetime: m.settings_templates_var_datetime,
	weekday: m.settings_templates_var_weekday,
	month: m.settings_templates_var_month,
	year: m.settings_templates_var_year,
	tag: m.settings_templates_var_tag,
	cursor: m.settings_templates_var_cursor
};

export function templateVariableOptions(): TemplateVariableOption[] {
	return TEMPLATE_VARIABLES.map((name) => ({ name, description: DESCRIPTIONS[name]() }));
}
