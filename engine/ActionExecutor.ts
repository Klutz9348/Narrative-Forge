
import { LogicAction, ScriptAction } from '../types';
import { IEventBus, IVariableStore } from './interfaces';
import { ActionRegistry } from './logic/ActionRegistry';
import { ActionContext, ActionExtension } from './logic/types';
import { actionRegistry as sharedActionRegistry } from './logic/registries';

export class ActionExecutor {
  private registry: ActionRegistry;

  constructor(
    private store: IVariableStore,
    private eventBus: IEventBus,
    registry: ActionRegistry = sharedActionRegistry
  ) {
    this.registry = registry;
  }

  register(extension: ActionExtension) {
    this.registry.register(extension);
  }

  async executeGroup(actions: (ScriptAction | LogicAction)[]): Promise<void> {
    for (const action of actions) {
      await this.execute(action);
    }
  }

  async execute(action: ScriptAction | LogicAction): Promise<void> {
    console.log(`[ActionExecutor] Executing ${action.type}`, action.params);

    const context: ActionContext = {
      variableStore: this.store,
      eventBus: this.eventBus,
      scope: 'global'
    };

    const runner = async () => {
      if (action.delayMs && action.delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, action.delayMs));
      }
      await this.registry.run(action, context);
    };

    if (action.async) {
      runner().catch(err => {
        if (action.ignoreError) {
          console.error(`[ActionExecutor] Ignored async error for action ${action.type}:`, err);
        } else {
          console.error(`[ActionExecutor] Async action failed: ${action.type}`, err);
        }
      });
      return;
    }

    try {
      await runner();
    } catch (e) {
      if (action.ignoreError) {
        console.error(`[ActionExecutor] Ignored error for action ${action.type}:`, e);
      } else {
        throw e;
      }
    }
  }
}
