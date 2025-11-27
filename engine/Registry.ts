
import { ScriptActionType } from '../types';

export type ParamType = 'string' | 'number' | 'boolean' | 'select' | 'entity';

export interface ParamConfig {
  name: string; // Key in params object
  label: string;
  type: ParamType;
  entityType?: 'character' | 'item' | 'clue' | 'attribute' | 'shop'; // For 'entity' type
  options?: { label: string; value: any }[]; // For 'select' type
  defaultValue?: any;
  placeholder?: string;
}

export interface ActionDefinition {
  type: ScriptActionType;
  label: string;
  category: 'rpg' | 'inventory' | 'knowledge' | 'interaction' | 'presentation';
  description?: string;
  iconName?: string; // Lucide icon name hint
  colorClass?: string; // Tailwind color class hint
  params: ParamConfig[];
}

export const ACTION_REGISTRY: Record<ScriptActionType, ActionDefinition> = {
  // --- RPG Attributes ---
  [ScriptActionType.UPDATE_ATTRIBUTE]: {
    type: ScriptActionType.UPDATE_ATTRIBUTE,
    label: '修改属性 (Attr)',
    category: 'rpg',
    description: '修改角色或全局属性的值',
    iconName: 'Gauge',
    colorClass: 'text-purple-400',
    params: [
      { name: 'attributeId', label: '属性', type: 'entity', entityType: 'attribute' },
      { name: 'op', label: '操作', type: 'select', options: [{label: '=', value: 'set'}, {label: '+', value: 'add'}, {label: '-', value: 'sub'}], defaultValue: 'set' },
      { name: 'value', label: '值', type: 'number', defaultValue: 0 }
    ]
  },

  // --- Inventory ---
  [ScriptActionType.ADD_ITEM]: {
    type: ScriptActionType.ADD_ITEM,
    label: '添加物品 (Add Item)',
    category: 'inventory',
    iconName: 'Package',
    colorClass: 'text-amber-400',
    params: [
      { name: 'itemId', label: '物品', type: 'entity', entityType: 'item' },
      { name: 'count', label: '数量', type: 'number', defaultValue: 1 }
    ]
  },
  [ScriptActionType.REMOVE_ITEM]: {
    type: ScriptActionType.REMOVE_ITEM,
    label: '移除物品 (Remove Item)',
    category: 'inventory',
    iconName: 'MinusCircle',
    colorClass: 'text-red-400',
    params: [
      { name: 'itemId', label: '物品', type: 'entity', entityType: 'item' },
      { name: 'count', label: '数量', type: 'number', defaultValue: 1 }
    ]
  },

  // --- Knowledge ---
  [ScriptActionType.ADD_CLUE]: {
    type: ScriptActionType.ADD_CLUE,
    label: '获得线索 (Get Clue)',
    category: 'knowledge',
    iconName: 'Search',
    colorClass: 'text-cyan-400',
    params: [
      { name: 'characterId', label: '获得者', type: 'entity', entityType: 'character' },
      { name: 'clueId', label: '线索', type: 'entity', entityType: 'clue' }
    ]
  },
  [ScriptActionType.REMOVE_CLUE]: {
    type: ScriptActionType.REMOVE_CLUE,
    label: '失去线索 (Lost Clue)',
    category: 'knowledge',
    iconName: 'Search',
    colorClass: 'text-zinc-400',
    params: [
      { name: 'characterId', label: '失去者', type: 'entity', entityType: 'character' },
      { name: 'clueId', label: '线索', type: 'entity', entityType: 'clue' }
    ]
  },
  [ScriptActionType.SHARE_CLUE]: {
    type: ScriptActionType.SHARE_CLUE,
    label: '分享线索 (Share)',
    category: 'knowledge',
    iconName: 'Share2',
    colorClass: 'text-indigo-400',
    params: [
      { name: 'fromCharacterId', label: '来源角色', type: 'entity', entityType: 'character' },
      { name: 'toCharacterId', label: '目标角色', type: 'entity', entityType: 'character' },
      { name: 'clueId', label: '线索', type: 'entity', entityType: 'clue' }
    ]
  },

  // --- Interaction ---
  [ScriptActionType.OPEN_SHOP]: {
    type: ScriptActionType.OPEN_SHOP,
    label: '打开商店 (Shop)',
    category: 'interaction',
    iconName: 'ShoppingCart',
    colorClass: 'text-emerald-400',
    params: [
      { name: 'shopId', label: '商店', type: 'entity', entityType: 'shop' }
    ]
  },
  [ScriptActionType.OPEN_CRAFTING]: {
    type: ScriptActionType.OPEN_CRAFTING,
    label: '打开合成 (Crafting)',
    category: 'interaction',
    iconName: 'Zap',
    colorClass: 'text-amber-500',
    params: []
  },

  // --- Presentation ---
  [ScriptActionType.PLAY_SOUND]: {
    type: ScriptActionType.PLAY_SOUND,
    label: '播放音效 (Sound)',
    category: 'presentation',
    iconName: 'Zap',
    colorClass: 'text-pink-400',
    params: [
      { name: 'soundId', label: 'Sound ID/URL', type: 'string' },
      { name: 'volume', label: '音量 (0-1)', type: 'number', defaultValue: 1 }
    ]
  },
  [ScriptActionType.WAIT]: {
    type: ScriptActionType.WAIT,
    label: '等待 (Wait)',
    category: 'presentation',
    iconName: 'Timer',
    colorClass: 'text-blue-400',
    params: [
      { name: 'duration', label: '时长 (秒)', type: 'number', defaultValue: 1 }
    ]
  },
  [ScriptActionType.SCREEN_SHAKE]: {
    type: ScriptActionType.SCREEN_SHAKE,
    label: '屏幕震动 (Shake)',
    category: 'presentation',
    iconName: 'Smartphone',
    colorClass: 'text-orange-400',
    params: [
      { name: 'intensity', label: '强度', type: 'select', options: [{label: 'Low', value: 'low'}, {label: 'Medium', value: 'medium'}, {label: 'High', value: 'high'}], defaultValue: 'medium' },
      { name: 'duration', label: '时长 (秒)', type: 'number', defaultValue: 0.5 }
    ]
  },
  [ScriptActionType.SHOW_TOAST]: {
    type: ScriptActionType.SHOW_TOAST,
    label: '显示提示 (Toast)',
    category: 'presentation',
    iconName: 'MessageSquare',
    colorClass: 'text-green-400',
    params: [
      { name: 'message', label: '内容', type: 'string', placeholder: '提示信息...' }
    ]
  }
};
