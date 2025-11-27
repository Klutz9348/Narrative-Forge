
import { IVariableStore, IEventBus } from './interfaces';

export class VariableStore implements IVariableStore {
  private variables: Record<string, any> = {};
  private eventBus: IEventBus | null = null;

  constructor(initialData?: Record<string, any>) {
    if (initialData) {
      this.variables = { ...initialData };
    }
  }

  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  set(key: string, value: any): void {
    const oldValue = this.variables[key];
    this.variables[key] = value;
    console.log(`[VariableStore] Set ${key} = ${value}`);
    
    if (this.eventBus) {
      this.eventBus.emit('variable:changed', { key, value, oldValue });
    }
  }

  get(key: string): any {
    return this.variables[key];
  }

  getAll(): Record<string, any> {
    return { ...this.variables };
  }

  evaluateCondition(condition: string): boolean {
    if (!condition || condition.trim() === '') {
      return true;
    }

    console.log(`[VariableStore] Evaluating condition: "${condition}"`);
    
    try {
      // 警告：生产环境绝不能直接使用 eval，这里仅用于 MVP 原型演示
      // TODO: Replace with safe expression parser
      // const result = new Function('vars', `with(vars) { return ${condition} }`)(this.variables);
      // return !!result;
      return true;
    } catch (e) {
      console.warn(`[VariableStore] Condition evaluation failed: ${condition}`, e);
      return false;
    }
  }
}
