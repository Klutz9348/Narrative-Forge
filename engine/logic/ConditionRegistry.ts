import { LogicConditionNode } from '../../types';
import { ConditionContext, ConditionExtension } from './types';

export class ConditionRegistry {
  private conditions: Map<string, ConditionExtension> = new Map();

  register(extension: ConditionExtension) {
    this.conditions.set(extension.id, extension);
  }

  get(id: string): ConditionExtension | undefined {
    return this.conditions.get(id);
  }

  list(): ConditionExtension[] {
    return Array.from(this.conditions.values());
  }

  evaluate(node: LogicConditionNode, context: ConditionContext): boolean | Promise<boolean> {
    const handler = this.conditions.get(node.type);
    if (!handler) {
      console.warn(`[ConditionRegistry] No handler for condition ${node.type}`);
      return false;
    }

    if (handler.validate && handler.validate(node) === false) {
      console.warn(`[ConditionRegistry] Validation failed for condition ${node.type}`, node);
      return false;
    }

    return handler.evaluate(node, context);
  }
}
