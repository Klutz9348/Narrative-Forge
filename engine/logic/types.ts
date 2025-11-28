import { IEventBus, IVariableStore } from '../interfaces';
import { LogicConditionNode } from '../../types';

export type ParamType = 'string' | 'number' | 'boolean' | 'select' | 'entity';

export interface ParamConfig {
  name: string;
  label: string;
  type: ParamType;
  entityType?: 'character' | 'item' | 'clue' | 'attribute' | 'shop'; // For 'entity' type
  options?: { label: string; value: any }[];
  defaultValue?: any;
  placeholder?: string;
}

export interface ActionUIMetadata {
  id: string;
  label: string;
  category?: string;
  description?: string;
  iconName?: string;
  colorClass?: string;
  params: ParamConfig[];
}

export interface ConditionUIMetadata {
  id: string;
  label: string;
  description?: string;
  params?: ParamConfig[];
}

export type LogicScope = 'global' | 'scene' | 'character' | string;

export interface ActionContext {
  variableStore: IVariableStore;
  eventBus: IEventBus;
  scope?: LogicScope;
  variables?: Map<string, any> | Record<string, any>;
  services?: Record<string, any>;
}

export interface ConditionContext {
  variableStore: IVariableStore;
  eventBus: IEventBus;
  scope?: LogicScope;
  /**
   * Optional resolver for custom variable namespaces (e.g., quest, runtime flags).
   */
  resolveValue?: (key: string) => any;
  evaluate?: (node: LogicConditionNode) => boolean;
}

export abstract class ActionExtension {
  abstract readonly id: string;
  readonly ui?: ActionUIMetadata;
  validate?(params: Record<string, any>): boolean;
  abstract execute(params: Record<string, any>, context: ActionContext): Promise<void> | void;
}

export abstract class ConditionExtension {
  abstract readonly id: string;
  readonly ui?: ConditionUIMetadata;
  validate?(node: LogicConditionNode): boolean;
  abstract evaluate(node: LogicConditionNode, context: ConditionContext): boolean | Promise<boolean>;
}
