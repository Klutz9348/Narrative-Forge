import { LogicConditionNode } from '../../types';
import { ConditionRegistry } from './ConditionRegistry';
import { ConditionContext, ConditionExtension } from './types';
import { IEventBus, IVariableStore } from '../interfaces';

export class ConditionEngine {
  constructor(
    private registry: ConditionRegistry,
    private variableStore: IVariableStore,
    private eventBus: IEventBus
  ) {}

  register(extension: ConditionExtension) {
    this.registry.register(extension);
  }

  evaluate(node?: LogicConditionNode, context?: Partial<ConditionContext>): boolean {
    if (!node) return true;

    const mergedContext: ConditionContext = {
      variableStore: this.variableStore,
      eventBus: this.eventBus,
      scope: context?.scope,
      resolveValue: context?.resolveValue,
      evaluate: (child) => this.evaluate(child, context),
    };

    const result = this.registry.evaluate(node, mergedContext);
    const resolved = typeof (result as any)?.then === 'function'
      ? (console.warn(`[ConditionEngine] Async condition is not supported in sync pipeline: ${node.type}`), false)
      : !!result;

    return node.negate ? !resolved : resolved;
  }

  evaluateLegacy(expression: string): boolean {
    return this.variableStore.evaluateCondition(expression);
  }
}
