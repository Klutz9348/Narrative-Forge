import { ActionRegistry } from './ActionRegistry';
import { ConditionRegistry } from './ConditionRegistry';
import { createDefaultActionRegistry } from './builtins/actions';
import { createDefaultConditionRegistry } from './builtins/conditions';
import { ActionExtension, ConditionExtension } from './types';

// Shared registries to keep runtime and editor in sync
export const actionRegistry: ActionRegistry = createDefaultActionRegistry();
export const conditionRegistry: ConditionRegistry = createDefaultConditionRegistry();

export const registerActionExtension = (ext: ActionExtension) => actionRegistry.register(ext);
export const registerConditionExtension = (ext: ConditionExtension) => conditionRegistry.register(ext);
