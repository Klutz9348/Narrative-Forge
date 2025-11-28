import { actionRegistry, conditionRegistry } from './registries';
import { ActionUIMetadata, ConditionUIMetadata } from './types';

export const getActionCatalog = (): ActionUIMetadata[] => {
  return actionRegistry.list().map((ext) => ({
    id: ext.id,
    label: ext.ui?.label || ext.id,
    category: ext.ui?.category,
    description: ext.ui?.description,
    iconName: ext.ui?.iconName,
    colorClass: ext.ui?.colorClass,
    params: ext.ui?.params || [],
  }));
};

export const getConditionCatalog = (): ConditionUIMetadata[] => {
  return conditionRegistry.list().map((ext) => ({
    id: ext.id,
    label: ext.ui?.label || ext.id,
    description: ext.ui?.description,
    params: ext.ui?.params || [],
  }));
};
