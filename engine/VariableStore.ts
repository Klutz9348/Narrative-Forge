// 文件路径: engine/VariableStore.ts

import { IVariableStore, IEventBus } from './interfaces';
import { StoryAsset, AttributeDefinition, Item, Clue } from '../types';

interface RuntimeClueState {
  revealed: boolean;
  owners: string[]; // Character IDs
}

export class VariableStore implements IVariableStore {
  private eventBus: IEventBus | null = null;
  
  // Definitions (Read-only reference to Story Asset)
  private attributeDefs: Map<string, AttributeDefinition> = new Map();
  private itemDefs: Map<string, Item> = new Map();
  
  // Runtime State
  private attributes: Record<string, any> = {}; // key -> value
  private inventory: Record<string, number> = {}; // itemId -> count
  private clueStates: Record<string, RuntimeClueState> = {}; // clueId -> state

  constructor() {}

  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  init(story: StoryAsset): void {
    // 1. Load Definitions
    this.attributeDefs.clear();
    story.attributes.forEach(attr => this.attributeDefs.set(attr.id, attr));
    
    this.itemDefs.clear();
    story.items.forEach(item => this.itemDefs.set(item.id, item));

    // 2. Initialize Runtime State with Defaults
    this.attributes = {};
    story.attributes.forEach(attr => {
      this.attributes[attr.id] = attr.defaultValue;
    });

    // Reset Inventory
    this.inventory = {};

    // Reset Clues
    this.clueStates = {};
    story.clues.forEach(clue => {
      this.clueStates[clue.id] = {
        revealed: clue.revealed,
        owners: [...(clue.owners || [])]
      };
    });

    console.log('[VariableStore] Initialized with RPG State:', { 
      attrs: this.attributes, 
      clues: Object.keys(this.clueStates).length 
    });
  }

  getAll(): Record<string, any> {
    return {
      attributes: { ...this.attributes },
      inventory: { ...this.inventory },
      clues: { ...this.clueStates }
    };
  }

  // --- Attribute System ---

  setAttribute(id: string, value: any): void {
    const def = this.attributeDefs.get(id);
    // Support setting by key as well if id not found
    const targetId = def ? id : Array.from(this.attributeDefs.values()).find(a => a.key === id)?.id || id;
    const targetDef = this.attributeDefs.get(targetId);

    let finalValue = value;

    // Type Checking & Clamping
    if (targetDef) {
        if (targetDef.type === 'number') {
            finalValue = Number(value);
            if (targetDef.min !== undefined) finalValue = Math.max(targetDef.min, finalValue);
            if (targetDef.max !== undefined) finalValue = Math.min(targetDef.max, finalValue);
        } else if (targetDef.type === 'boolean') {
            finalValue = String(value) === 'true';
        }
    }

    const oldValue = this.attributes[targetId];
    this.attributes[targetId] = finalValue;

    if (oldValue !== finalValue && this.eventBus) {
      this.eventBus.emit('attribute:changed', { id: targetId, key: targetDef?.key || targetId, value: finalValue, oldValue });
    }
  }

  getAttribute(idOrKey: string): any {
    // Try direct ID match
    if (this.attributes[idOrKey] !== undefined) return this.attributes[idOrKey];
    
    // Try Key match
    const def = Array.from(this.attributeDefs.values()).find(a => a.key === idOrKey);
    if (def) return this.attributes[def.id];
    
    return undefined;
  }

  modifyAttribute(id: string, operator: 'add' | 'sub' | 'set', value: number): void {
    const current = Number(this.getAttribute(id) || 0);
    let newVal = current;
    
    if (operator === 'add') newVal += value;
    if (operator === 'sub') newVal -= value;
    if (operator === 'set') newVal = value;

    this.setAttribute(id, newVal);
  }

  // --- Inventory System ---

  addItem(itemId: string, count: number = 1): void {
    const current = this.inventory[itemId] || 0;
    const def = this.itemDefs.get(itemId);
    
    // Check stackability
    if (def && !def.stackable && current >= 1) {
       console.log(`[VariableStore] Item ${def.name} is not stackable and already owned.`);
       return; 
    }

    this.inventory[itemId] = current + count;
    
    if (this.eventBus) {
        this.eventBus.emit('inventory:added', { itemId, count, total: this.inventory[itemId] });
    }
  }

  removeItem(itemId: string, count: number = 1): void {
    const current = this.inventory[itemId] || 0;
    const newVal = Math.max(0, current - count);
    
    if (newVal === 0) {
        delete this.inventory[itemId];
    } else {
        this.inventory[itemId] = newVal;
    }

    if (this.eventBus) {
        this.eventBus.emit('inventory:removed', { itemId, count, total: newVal });
    }
  }

  getItemCount(itemId: string): number {
    return this.inventory[itemId] || 0;
  }

  hasItem(itemId: string, count: number = 1): boolean {
    return this.getItemCount(itemId) >= count;
  }

  // --- Knowledge System (Clues) ---

  addClue(clueId: string, characterId?: string): void {
    const state = this.clueStates[clueId];
    if (!state) return;

    if (!state.revealed) {
        state.revealed = true;
        this.eventBus?.emit('clue:revealed', { clueId });
    }

    if (characterId && !state.owners.includes(characterId)) {
        state.owners.push(characterId);
        this.eventBus?.emit('clue:obtained', { clueId, characterId });
    }
  }

  removeClue(clueId: string, characterId?: string): void {
    const state = this.clueStates[clueId];
    if (!state) return;

    if (characterId) {
        state.owners = state.owners.filter(id => id !== characterId);
        this.eventBus?.emit('clue:lost', { clueId, characterId });
    }
  }

  shareClue(clueId: string, fromCharacterId: string, toCharacterId: string): void {
    const state = this.clueStates[clueId];
    if (!state) return;

    if (state.owners.includes(fromCharacterId) && !state.owners.includes(toCharacterId)) {
        this.addClue(clueId, toCharacterId);
        this.eventBus?.emit('clue:shared', { clueId, from: fromCharacterId, to: toCharacterId });
    }
  }

  hasClue(clueId: string, characterId?: string): boolean {
    const state = this.clueStates[clueId];
    if (!state) return false;
    if (!state.revealed) return false;
    if (!characterId) return true;
    return state.owners.includes(characterId);
  }

  isClueRevealed(clueId: string): boolean {
      return this.clueStates[clueId]?.revealed || false;
  }

  // --- Condition Logic (Safe Implementation) ---

  evaluateCondition(condition: string): boolean {
    if (!condition || condition.trim() === '') return true;

    // Remove logic: Use a safe parser instead of eval/new Function
    // Supports: "varName >= 10", "hasKey == true", "coin < 5"
    
    // 1. Simple Tokenizer
    // Matches: [Variable] [Operator] [Value]
    const match = condition.match(/^(\w+)\s*([><=!]+|contains)\s*(.+)$/);
    
    if (!match) {
        // Fallback: Check if it's just a boolean variable name like "hasKey"
        const val = this.getAttribute(condition.trim());
        return !!val;
    }

    const [, key, op, valStr] = match;
    const currentVal = this.getAttribute(key);
    
    // Parse target value
    let targetVal: any = valStr.trim();
    if (targetVal === 'true') targetVal = true;
    else if (targetVal === 'false') targetVal = false;
    else if (!isNaN(Number(targetVal))) targetVal = Number(targetVal);
    else if (targetVal.startsWith("'") || targetVal.startsWith('"')) targetVal = targetVal.slice(1, -1);

    // Compare
    switch (op) {
        case '==': return currentVal == targetVal;
        case '!=': return currentVal != targetVal;
        case '>': return Number(currentVal) > Number(targetVal);
        case '>=': return Number(currentVal) >= Number(targetVal);
        case '<': return Number(currentVal) < Number(targetVal);
        case '<=': return Number(currentVal) <= Number(targetVal);
        case 'contains': return String(currentVal).includes(String(targetVal));
        default: 
            console.warn(`[VariableStore] Unknown operator ${op} in condition ${condition}`);
            return false;
    }
  }
}