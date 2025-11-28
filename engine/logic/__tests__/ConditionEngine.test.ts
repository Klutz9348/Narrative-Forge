import { describe, expect, it } from 'vitest';
import { ConditionEngine } from '../ConditionEngine';
import { createDefaultConditionRegistry } from '../builtins/conditions';
import { IVariableStore, IEventBus } from '../../interfaces';
import { LogicConditionNode } from '../../../types';

const createStore = () => {
  const attributes: Record<string, any> = {};
  const inventory: Record<string, number> = {};
  const clues: Record<string, { revealed: boolean; owners: Set<string> }> = {};

  const store: IVariableStore = {
    setEventBus: () => {},
    init: () => {},
    getAll: () => ({ attributes, inventory, clues }),
    evaluateCondition: () => true,
    setAttribute: (key, value) => { attributes[key] = value; },
    getAttribute: (key) => attributes[key],
    modifyAttribute: (key, op, value) => {
      const current = Number(attributes[key] || 0);
      if (op === 'add') attributes[key] = current + value;
      else if (op === 'sub') attributes[key] = current - value;
      else attributes[key] = value;
    },
    addItem: (id, count = 1) => { inventory[id] = (inventory[id] || 0) + count; },
    removeItem: (id, count = 1) => { inventory[id] = Math.max(0, (inventory[id] || 0) - count); },
    getItemCount: (id) => inventory[id] || 0,
    hasItem: (id, count = 1) => (inventory[id] || 0) >= count,
    addClue: (id, characterId) => {
      if (!clues[id]) clues[id] = { revealed: true, owners: new Set() };
      clues[id].revealed = true;
      if (characterId) clues[id].owners.add(characterId);
    },
    removeClue: (id, characterId) => {
      const state = clues[id];
      if (!state) return;
      if (characterId) state.owners.delete(characterId);
    },
    shareClue: (id, from, to) => {
      const state = clues[id];
      if (!state || !state.owners.has(from)) return;
      state.owners.add(to);
    },
    hasClue: (id, characterId) => {
      const state = clues[id];
      if (!state || !state.revealed) return false;
      if (!characterId) return true;
      return state.owners.has(characterId);
    },
    isClueRevealed: (id) => !!clues[id]?.revealed,
  };

  return { store, attributes, inventory, clues };
};

const eventBus: IEventBus = {
  on: () => {},
  off: () => {},
  emit: () => {},
};

describe('ConditionEngine', () => {
  const { store, attributes, inventory } = createStore();
  const engine = new ConditionEngine(createDefaultConditionRegistry(), store, eventBus);

  it('evaluates logic trees (AND / OR / NOT)', () => {
    attributes.hp = 10;
    const node: LogicConditionNode = {
      type: 'LOGIC_AND',
      children: [
        { type: 'VAL_COMPARE', params: { left: { var: 'hp' }, operator: '>=', right: 5 } },
        {
          type: 'LOGIC_OR',
          children: [
            { type: 'VAL_COMPARE', params: { left: { var: 'hp' }, operator: '==', right: 10 } },
            { type: 'LOGIC_NOT', children: [{ type: 'VAL_COMPARE', params: { left: { var: 'hp' }, operator: '<', right: 0 } }] },
          ],
        },
      ],
    };

    expect(engine.evaluate(node)).toBe(true);
  });

  it('evaluates inventory and clue based guards', () => {
    inventory['item_key'] = 2;
    store.addClue('clue_1', 'char_1');

    expect(engine.evaluate({ type: 'HAS_ITEM', params: { itemId: 'item_key', count: 2 } })).toBe(true);
    expect(engine.evaluate({ type: 'HAS_CLUE', params: { clueId: 'clue_1', characterId: 'char_1' } })).toBe(true);
    expect(engine.evaluate({ type: 'HAS_CLUE', params: { clueId: 'clue_1', characterId: 'char_missing' } })).toBe(false);
  });
});
