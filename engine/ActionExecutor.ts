
import { IEventBus, IVariableStore } from './interfaces';
import { ScriptAction, ScriptActionType } from '../types';

export class ActionExecutor {
  constructor(
    private store: IVariableStore,
    private eventBus: IEventBus
  ) {}

  async executeGroup(actions: ScriptAction[]): Promise<void> {
    for (const action of actions) {
      await this.execute(action);
    }
  }

  async execute(action: ScriptAction): Promise<void> {
    console.log(`[ActionExecutor] Executing ${action.type}`, action.params);

    try {
      switch (action.type) {
        // --- RPG Attributes ---
        case ScriptActionType.UPDATE_ATTRIBUTE: {
          const { attributeId, op, value } = action.params;
          if (attributeId) {
            this.store.modifyAttribute(attributeId, op || 'set', Number(value));
          }
          break;
        }

        // --- Inventory ---
        case ScriptActionType.ADD_ITEM: {
          const { itemId, count } = action.params;
          if (itemId) this.store.addItem(itemId, count || 1);
          break;
        }
        case ScriptActionType.REMOVE_ITEM: {
          const { itemId, count } = action.params;
          if (itemId) this.store.removeItem(itemId, count || 1);
          break;
        }

        // --- Knowledge / Clues ---
        case ScriptActionType.ADD_CLUE: {
          const { clueId, characterId } = action.params;
          if (clueId) this.store.addClue(clueId, characterId);
          break;
        }
        case ScriptActionType.REMOVE_CLUE: {
          const { clueId, characterId } = action.params;
          if (clueId) this.store.removeClue(clueId, characterId);
          break;
        }
        case ScriptActionType.SHARE_CLUE: {
          const { clueId, fromCharacterId, toCharacterId } = action.params;
          if (clueId && fromCharacterId && toCharacterId) {
            this.store.shareClue(clueId, fromCharacterId, toCharacterId);
          }
          break;
        }

        // --- Interaction / Commerce ---
        case ScriptActionType.OPEN_SHOP: {
          const { shopId } = action.params;
          if (shopId) {
            this.eventBus.emit('ui:openShop', { shopId });
          }
          break;
        }
        case ScriptActionType.OPEN_CRAFTING: {
            this.eventBus.emit('ui:openCrafting', action.params);
            break;
        }

        // --- Presentation ---
        case ScriptActionType.SHOW_TOAST: {
          const { message, duration } = action.params;
          this.eventBus.emit('ui:toast', { message, duration });
          break;
        }
        case ScriptActionType.PLAY_SOUND: {
          const { soundId, volume } = action.params;
          this.eventBus.emit('audio:playSfx', { soundId, volume });
          break;
        }
        case ScriptActionType.SCREEN_SHAKE: {
          const { intensity, duration } = action.params;
          this.eventBus.emit('ui:shake', { intensity, duration });
          break;
        }
        case ScriptActionType.WAIT: {
          const { duration } = action.params;
          const seconds = duration || 1;
          await new Promise(resolve => setTimeout(resolve, seconds * 1000));
          break;
        }

        default:
          console.warn(`[ActionExecutor] Unknown action type: ${action.type}`);
      }
    } catch (e) {
      console.error(`[ActionExecutor] Failed to execute action ${action.id}:`, e);
    }
  }
}
