import Root from './select-root.svelte';
import Trigger from './select-trigger.svelte';
import Content from './select-content.svelte';
import Item from './select-item.svelte';
import { Select as SelectPrimitive } from 'bits-ui';

const Value = SelectPrimitive.Value;

export { Root, Trigger, Content, Item, Value };
export { Root as Select, Trigger as SelectTrigger, Content as SelectContent, Item as SelectItem, Value as SelectValue };
