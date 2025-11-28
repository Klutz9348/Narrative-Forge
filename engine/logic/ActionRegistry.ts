import { LogicAction, ScriptAction } from '../../types';
import { ActionContext, ActionExtension } from './types';

export class ActionRegistry {
  private actions: Map<string, ActionExtension> = new Map();

  register(extension: ActionExtension) {
    this.actions.set(extension.id, extension);
  }

  get(id: string): ActionExtension | undefined {
    return this.actions.get(id);
  }

  list(): ActionExtension[] {
    return Array.from(this.actions.values());
  }

  async run(action: LogicAction | ScriptAction, context: ActionContext): Promise<void> {
    const typeKey = String(action.type);
    const handler = this.actions.get(typeKey);

    if (!handler) {
      console.warn(`[ActionRegistry] No handler registered for action ${typeKey}`);
      return;
    }

    if (handler.validate && handler.validate(action.params || {}) === false) {
      console.warn(`[ActionRegistry] Validation failed for action ${typeKey}`, action.params);
      return;
    }

    await handler.execute(action.params || {}, context);
  }
}
