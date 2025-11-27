
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
    if (!def) {
      console.warn(`[VariableStore] Setting unknown attribute: ${id}`);
      this.attributes[id] = value; // Fallback for legacy vars
      return;
    }

    let finalValue = value;

    // Type Checking & Clamping
    if (def.type === 'number') {
      finalValue = Number(value);
      if (def.min !== undefined) finalValue = Math.max(def.min, finalValue);
      if (def.max !== undefined) finalValue = Math.min(def.max, finalValue);
    } else if (def.type === 'boolean') {
      finalValue = Boolean(value);
    }

    const oldValue = this.attributes[id];
    this.attributes[id] = finalValue;

    if (oldValue !== finalValue && this.eventBus) {
      this.eventBus.emit('attribute:changed', { id, key: def.key, value: finalValue, oldValue });
    }
  }

  getAttribute(id: string): any {
    return this.attributes[id];
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
    
    // Check stackability (Simplified logic: if not stackable, max is 1)
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

    // 1. Reveal it globally (Conceptually, obtaining a clue usually reveals it)
    if (!state.revealed) {
        state.revealed = true;
        this.eventBus?.emit('clue:revealed', { clueId });
    }

    // 2. Assign ownership
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
    
    // If no character specified, just check if it's revealed/available
    if (!characterId) return true;
    return state.owners.includes(characterId);
  }

  isClueRevealed(clueId: string): boolean {
      return this.clueStates[clueId]?.revealed || false;
  }

  // --- Condition Logic ---

  evaluateCondition(condition: string): boolean {
    if (!condition || condition.trim() === '') return true;

    // TODO: Implement proper parser. For MVP, we map attribute keys to values.
    // This allows conditions like "sanity > 50" if attribute key is 'sanity'.
    const scope: Record<string, any> = {};
    
    // Map Attribute Definitions to current values
    this.attributeDefs.forEach(def => {
        scope[def.key] = this.getAttribute(def.id);
        // Also map by ID just in case
        scope[def.id] = this.getAttribute(def.id);
    });

    console.log(`[VariableStore] Eval: "${condition}" with scope:`, scope);

    try {
      // DANGEROUS: MVP Only.
      const result = new Function('vars', `with(vars) { return ${condition} }`)(scope);
      return !!result;
    } catch (e) {
      console.warn(`[VariableStore] Condition failed: ${condition}`, e);
      return false;
    }
  }
}
