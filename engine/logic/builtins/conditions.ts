import { LogicConditionNode } from '../../../types';
import { ConditionRegistry } from '../ConditionRegistry';
import { ConditionContext, ConditionExtension, ConditionUIMetadata, ParamType } from '../types';
import { IEventBus, IVariableStore } from '../../interfaces';

const STRING: ParamType = 'string';
const SELECT: ParamType = 'select';
const ENTITY: ParamType = 'entity';
const NUMBER: ParamType = 'number';
const BOOLEAN: ParamType = 'boolean';

const resolveOperand = (raw: any, ctx: ConditionContext): any => {
  if (raw === undefined || raw === null) return raw;

  if (typeof raw === 'object') {
    if ('var' in raw) return ctx.variableStore.getAttribute(String(raw.var));
    if ('attributeId' in raw) return ctx.variableStore.getAttribute(String((raw as any).attributeId));
    if ('attributeKey' in raw) return ctx.variableStore.getAttribute(String((raw as any).attributeKey));
    if ((raw as any).kind === 'itemCount' && (raw as any).itemId) {
      return ctx.variableStore.getItemCount(String((raw as any).itemId));
    }
    if ((raw as any).kind === 'flag' && (raw as any).key) {
      return ctx.variableStore.getAttribute(String((raw as any).key));
    }
  }

  if (typeof raw === 'string') {
    if (raw.startsWith('$')) {
      const val = ctx.variableStore.getAttribute(raw.slice(1));
      if (val !== undefined) return val;
    }
    if (ctx.resolveValue) {
      const resolved = ctx.resolveValue(raw);
      if (resolved !== undefined) return resolved;
    }
  }

  return raw;
};

const compareValues = (left: any, right: any, operator: string): boolean => {
  switch (operator) {
    case '==': return left == right; // eslint-disable-line eqeqeq
    case '!=': return left != right; // eslint-disable-line eqeqeq
    case '>': return Number(left) > Number(right);
    case '>=': return Number(left) >= Number(right);
    case '<': return Number(left) < Number(right);
    case '<=': return Number(left) <= Number(right);
    case 'contains': return String(left).includes(String(right));
    default: return false;
  }
};

class LogicAndCondition implements ConditionExtension {
  readonly id = 'LOGIC_AND';
  readonly ui: ConditionUIMetadata = { id: this.id, label: '逻辑与 (AND)', description: '所有子条件为真' };
  evaluate(node: LogicConditionNode, ctx: ConditionContext): boolean {
    const children = node.children || [];
    if (children.length === 0) return true;
    return children.every(child => ctx.evaluate ? ctx.evaluate(child) : false);
  }
}

class LogicOrCondition implements ConditionExtension {
  readonly id = 'LOGIC_OR';
  readonly ui: ConditionUIMetadata = { id: this.id, label: '逻辑或 (OR)', description: '任一子条件为真' };
  evaluate(node: LogicConditionNode, ctx: ConditionContext): boolean {
    const children = node.children || [];
    if (children.length === 0) return false;
    return children.some(child => ctx.evaluate ? ctx.evaluate(child) : false);
  }
}

class LogicNotCondition implements ConditionExtension {
  readonly id = 'LOGIC_NOT';
  readonly ui: ConditionUIMetadata = { id: this.id, label: '逻辑非 (NOT)', description: '取反第一个子条件' };
  evaluate(node: LogicConditionNode, ctx: ConditionContext): boolean {
    const child = node.children?.[0];
    const value = child && ctx.evaluate ? ctx.evaluate(child) : false;
    return !value;
  }
}

class ValueCompareCondition implements ConditionExtension {
  readonly id = 'VAL_COMPARE';
  readonly ui: ConditionUIMetadata = { 
    id: this.id, 
    label: '值比较 (Compare)',
    params: [
      { name: 'left', label: '左值', type: STRING },
      { name: 'operator', label: '操作符', type: SELECT, options: [{ label: '==', value: '==' }, { label: '!=', value: '!=' }, { label: '>', value: '>' }, { label: '>=', value: '>=' }, { label: '<', value: '<' }, { label: '<=', value: '<=' }, { label: '包含', value: 'contains' }], defaultValue: '==' },
      { name: 'right', label: '右值', type: STRING }
    ]
  };
  evaluate(node: LogicConditionNode, ctx: ConditionContext): boolean {
    const { left, right, operator } = node.params || {};
    return compareValues(
      resolveOperand(left, ctx),
      resolveOperand(right, ctx),
      operator || '=='
    );
  }
}

class HasItemCondition implements ConditionExtension {
  readonly id = 'HAS_ITEM';
  readonly ui: ConditionUIMetadata = { 
    id: this.id, 
    label: '拥有物品 (Has Item)', 
    params: [
      { name: 'itemId', label: '物品', type: ENTITY, entityType: 'item' },
      { name: 'count', label: '数量', type: NUMBER, defaultValue: 1 }
    ]
  };
  evaluate(node: LogicConditionNode, ctx: ConditionContext): boolean {
    const { itemId, count } = node.params || {};
    if (!itemId) return false;
    return ctx.variableStore.hasItem(String(itemId), Number(count) || 1);
  }
}

class HasClueCondition implements ConditionExtension {
  readonly id = 'HAS_CLUE';
  readonly ui: ConditionUIMetadata = { 
    id: this.id, 
    label: '拥有线索 (Has Clue)', 
    params: [
      { name: 'clueId', label: '线索', type: ENTITY, entityType: 'clue' },
      { name: 'characterId', label: '角色', type: ENTITY, entityType: 'character' }
    ]
  };
  evaluate(node: LogicConditionNode, ctx: ConditionContext): boolean {
    const { clueId, characterId } = node.params || {};
    if (!clueId) return false;
    return ctx.variableStore.hasClue(String(clueId), characterId ? String(characterId) : undefined);
  }
}

class CheckFlagCondition implements ConditionExtension {
  readonly id = 'CHECK_FLAG';
  readonly ui: ConditionUIMetadata = { 
    id: this.id, 
    label: '检查标记 (Flag)', 
    params: [
      { name: 'key', label: '标记 Key', type: STRING },
      { name: 'expected', label: '预期值', type: BOOLEAN, defaultValue: true }
    ]
  };
  evaluate(node: LogicConditionNode, ctx: ConditionContext): boolean {
    const { key, expected = true } = node.params || {};
    if (!key) return false;
    const val = resolveOperand({ key, kind: 'flag' }, ctx);
    return !!val === !!expected;
  }
}

export const createDefaultConditionRegistry = (
  _variableStore?: IVariableStore,
  _eventBus?: IEventBus
): ConditionRegistry => {
  const registry = new ConditionRegistry();

  registry.register(new LogicAndCondition());
  registry.register(new LogicOrCondition());
  registry.register(new LogicNotCondition());
  registry.register(new ValueCompareCondition());
  registry.register(new HasItemCondition());
  registry.register(new HasClueCondition());
  registry.register(new CheckFlagCondition());

  // Registry is intentionally exposed for future extensions
  return registry;
};
