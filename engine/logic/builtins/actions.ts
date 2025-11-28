import { ScriptActionType } from '../../../types';
import { ActionRegistry } from '../ActionRegistry';
import { ActionContext, ActionExtension, ActionUIMetadata, ParamType } from '../types';
import { IEventBus, IVariableStore } from '../../interfaces';

const STRING: ParamType = 'string';
const NUMBER: ParamType = 'number';
const SELECT: ParamType = 'select';
const ENTITY: ParamType = 'entity';
const NONE: ParamType = 'string';

class UpdateAttributeAction extends ActionExtension {
  readonly id = ScriptActionType.UPDATE_ATTRIBUTE;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '修改属性 (Attr)',
    category: 'rpg',
    iconName: 'Gauge',
    colorClass: 'text-purple-400',
    params: [
      { name: 'attributeId', label: '属性', type: ENTITY, entityType: 'attribute' },
      { name: 'op', label: '操作', type: SELECT, options: [{ label: '=', value: 'set' }, { label: '+', value: 'add' }, { label: '-', value: 'sub' }], defaultValue: 'set' },
      { name: 'value', label: '值', type: NUMBER, defaultValue: 0 }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    const { attributeId, op = 'set', value } = params;
    if (!attributeId) return;
    if (op === 'set') {
      context.variableStore.setAttribute(String(attributeId), value);
    } else {
      context.variableStore.modifyAttribute(String(attributeId), op, Number(value));
    }
  }
}

class AddItemAction extends ActionExtension {
  readonly id = ScriptActionType.ADD_ITEM;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '添加物品 (Add Item)',
    category: 'inventory',
    iconName: 'Package',
    colorClass: 'text-amber-400',
    params: [
      { name: 'itemId', label: '物品', type: ENTITY, entityType: 'item' },
      { name: 'count', label: '数量', type: NUMBER, defaultValue: 1 }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    const { itemId, count = 1 } = params;
    if (!itemId) return;
    context.variableStore.addItem(String(itemId), Number(count));
  }
}

class RemoveItemAction extends ActionExtension {
  readonly id = ScriptActionType.REMOVE_ITEM;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '移除物品 (Remove Item)',
    category: 'inventory',
    iconName: 'MinusCircle',
    colorClass: 'text-red-400',
    params: [
      { name: 'itemId', label: '物品', type: ENTITY, entityType: 'item' },
      { name: 'count', label: '数量', type: NUMBER, defaultValue: 1 }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    const { itemId, count = 1 } = params;
    if (!itemId) return;
    context.variableStore.removeItem(String(itemId), Number(count));
  }
}

class AddClueAction extends ActionExtension {
  readonly id = ScriptActionType.ADD_CLUE;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '获得线索 (Get Clue)',
    category: 'knowledge',
    iconName: 'Search',
    colorClass: 'text-cyan-400',
    params: [
      { name: 'characterId', label: '获得者', type: ENTITY, entityType: 'character' },
      { name: 'clueId', label: '线索', type: ENTITY, entityType: 'clue' }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    const { clueId, characterId } = params;
    if (!clueId) return;
    context.variableStore.addClue(String(clueId), characterId ? String(characterId) : undefined);
  }
}

class RemoveClueAction extends ActionExtension {
  readonly id = ScriptActionType.REMOVE_CLUE;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '失去线索 (Lost Clue)',
    category: 'knowledge',
    iconName: 'Search',
    colorClass: 'text-zinc-400',
    params: [
      { name: 'characterId', label: '失去者', type: ENTITY, entityType: 'character' },
      { name: 'clueId', label: '线索', type: ENTITY, entityType: 'clue' }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    const { clueId, characterId } = params;
    if (!clueId) return;
    context.variableStore.removeClue(String(clueId), characterId ? String(characterId) : undefined);
  }
}

class ShareClueAction extends ActionExtension {
  readonly id = ScriptActionType.SHARE_CLUE;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '分享线索 (Share)',
    category: 'knowledge',
    iconName: 'Share2',
    colorClass: 'text-indigo-400',
    params: [
      { name: 'fromCharacterId', label: '来源角色', type: ENTITY, entityType: 'character' },
      { name: 'toCharacterId', label: '目标角色', type: ENTITY, entityType: 'character' },
      { name: 'clueId', label: '线索', type: ENTITY, entityType: 'clue' }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    const { clueId, fromCharacterId, toCharacterId } = params;
    if (!clueId || !fromCharacterId || !toCharacterId) return;
    context.variableStore.shareClue(String(clueId), String(fromCharacterId), String(toCharacterId));
  }
}

class OpenShopAction extends ActionExtension {
  readonly id = ScriptActionType.OPEN_SHOP;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '打开商店 (Shop)',
    category: 'interaction',
    iconName: 'ShoppingCart',
    colorClass: 'text-emerald-400',
    params: [
      { name: 'shopId', label: '商店', type: ENTITY, entityType: 'shop' }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    if (!params.shopId) return;
    context.eventBus.emit('ui:openShop', { shopId: params.shopId });
  }
}

class OpenCraftingAction extends ActionExtension {
  readonly id = ScriptActionType.OPEN_CRAFTING;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '打开合成 (Crafting)',
    category: 'interaction',
    iconName: 'Zap',
    colorClass: 'text-amber-500',
    params: []
  };
  execute(params: Record<string, any>, context: ActionContext) {
    context.eventBus.emit('ui:openCrafting', params);
  }
}

class ShowToastAction extends ActionExtension {
  readonly id = ScriptActionType.SHOW_TOAST;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '显示提示 (Toast)',
    category: 'presentation',
    iconName: 'MessageSquare',
    colorClass: 'text-green-400',
    params: [
      { name: 'message', label: '内容', type: STRING, placeholder: '提示信息...' }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    const { message, duration } = params;
    context.eventBus.emit('ui:toast', { message, duration });
  }
}

class PlaySoundAction extends ActionExtension {
  readonly id = ScriptActionType.PLAY_SOUND;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '播放音效 (Sound)',
    category: 'presentation',
    iconName: 'Zap',
    colorClass: 'text-pink-400',
    params: [
      { name: 'soundId', label: 'Sound ID/URL', type: STRING },
      { name: 'volume', label: '音量 (0-1)', type: NUMBER, defaultValue: 1 }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    const { soundId, volume } = params;
    if (!soundId) return;
    context.eventBus.emit('audio:playSfx', { soundId, volume });
  }
}

class ScreenShakeAction extends ActionExtension {
  readonly id = ScriptActionType.SCREEN_SHAKE;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '屏幕震动 (Shake)',
    category: 'presentation',
    iconName: 'Smartphone',
    colorClass: 'text-orange-400',
    params: [
      { name: 'intensity', label: '强度', type: SELECT, options: [{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }], defaultValue: 'medium' },
      { name: 'duration', label: '时长 (秒)', type: NUMBER, defaultValue: 0.5 }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    const { intensity, duration } = params;
    context.eventBus.emit('ui:shake', { intensity, duration });
  }
}

class WaitAction extends ActionExtension {
  readonly id = ScriptActionType.WAIT;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '等待 (Wait)',
    category: 'presentation',
    iconName: 'Timer',
    colorClass: 'text-blue-400',
    params: [
      { name: 'duration', label: '时长 (秒)', type: NUMBER, defaultValue: 1 }
    ]
  };
  async execute(params: Record<string, any>) {
    const seconds = Number(params.duration || 1);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
}

class JumpToAction extends ActionExtension {
  readonly id = ScriptActionType.JUMP_TO;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '跳转到节点/场景 (Jump)',
    category: 'flow',
    iconName: 'ArrowRightCircle',
    colorClass: 'text-emerald-300',
    params: [
      { name: 'targetNodeId', label: '目标节点ID', type: 'string', placeholder: 'node_xxx' }
    ]
  };
  execute(params: Record<string, any>, context: ActionContext) {
    if (!params.targetNodeId) return;
    context.eventBus.emit('engine:jumpTo', { targetNodeId: params.targetNodeId });
  }
}

class AdvanceStoryAction extends ActionExtension {
  readonly id = ScriptActionType.ADVANCE;
  readonly ui: ActionUIMetadata = {
    id: this.id,
    label: '结束对话/推进 (Advance)',
    category: 'flow',
    iconName: 'SkipForward',
    colorClass: 'text-zinc-300',
    params: []
  };
  execute(_params: Record<string, any>, context: ActionContext) {
    context.eventBus.emit('engine:advance');
  }
}

export const createDefaultActionRegistry = (
  _variableStore?: IVariableStore,
  _eventBus?: IEventBus
): ActionRegistry => {
  const registry = new ActionRegistry();

  registry.register(new UpdateAttributeAction());
  registry.register(new AddItemAction());
  registry.register(new RemoveItemAction());
  registry.register(new AddClueAction());
  registry.register(new RemoveClueAction());
  registry.register(new ShareClueAction());
  registry.register(new OpenShopAction());
  registry.register(new OpenCraftingAction());
  registry.register(new ShowToastAction());
  registry.register(new PlaySoundAction());
  registry.register(new ScreenShakeAction());
  registry.register(new WaitAction());
  registry.register(new AdvanceStoryAction());
  registry.register(new JumpToAction());

  return registry;
};
