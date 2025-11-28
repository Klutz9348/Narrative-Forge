import { describe, expect, it, vi, afterEach } from 'vitest';
import { ActionExecutor } from '../../ActionExecutor';
import { createDefaultActionRegistry } from '../builtins/actions';
import { IEventBus, IVariableStore } from '../../interfaces';
import { ScriptActionType } from '../../../types';
import { ActionContext, ActionExtension } from '../types';

const createMockStore = () => {
  const modifyAttribute = vi.fn();
  const addItem = vi.fn();
  const removeItem = vi.fn();

  const store: IVariableStore = {
    setEventBus: () => {},
    init: () => {},
    getAll: () => ({}),
    evaluateCondition: () => true,
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    modifyAttribute,
    addItem,
    removeItem,
    getItemCount: () => 0,
    hasItem: () => false,
    addClue: vi.fn(),
    removeClue: vi.fn(),
    shareClue: vi.fn(),
    hasClue: () => false,
    isClueRevealed: () => false,
  };

  return { store, modifyAttribute, addItem, removeItem };
};

const createEventBus = () => {
  const emit = vi.fn();
  const bus: IEventBus = {
    on: vi.fn(),
    off: vi.fn(),
    emit,
  };
  return { bus, emit };
};

describe('ActionExecutor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs built-in actions via registry', async () => {
    const { store, modifyAttribute } = createMockStore();
    const { bus, emit } = createEventBus();
    const executor = new ActionExecutor(store, bus, createDefaultActionRegistry());

    await executor.execute({ id: 'a1', type: ScriptActionType.UPDATE_ATTRIBUTE, params: { attributeId: 'hp', op: 'add', value: 5 } });
    expect(modifyAttribute).toHaveBeenCalledWith('hp', 'add', 5);

    await executor.execute({ id: 'a2', type: ScriptActionType.SHOW_TOAST, params: { message: 'hi' } });
    expect(emit).toHaveBeenCalledWith('ui:toast', { message: 'hi', duration: undefined });
  });

  it('respects delay for WAIT action', async () => {
    vi.useFakeTimers();
    const { store } = createMockStore();
    const { bus } = createEventBus();
    const executor = new ActionExecutor(store, bus, createDefaultActionRegistry());

    const waitPromise = executor.execute({ id: 'wait', type: ScriptActionType.WAIT, params: { duration: 2 } });
    await vi.advanceTimersByTimeAsync(2000);
    await expect(waitPromise).resolves.toBeUndefined();
  });

  it('ignores errors when ignoreError + async flags are set', async () => {
    const { store } = createMockStore();
    const { bus } = createEventBus();
    const registry = createDefaultActionRegistry();

    class FailingAsyncAction extends ActionExtension {
      readonly id = 'FAILING_ASYNC';
      execute(): Promise<void> {
        return Promise.reject(new Error('boom'));
      }
    }

    registry.register(new FailingAsyncAction());
    const executor = new ActionExecutor(store, bus, registry);

    await expect(executor.execute({ id: 'x', type: 'FAILING_ASYNC', params: {}, async: true, ignoreError: true })).resolves.toBeUndefined();
  });

  it('throws when handler fails without ignoreError', async () => {
    const { store } = createMockStore();
    const { bus } = createEventBus();
    const registry = createDefaultActionRegistry();

    class ThrowingAction extends ActionExtension {
      readonly id = 'THROW_SYNC';
      execute(): void {
        throw new Error('fail');
      }
    }

    registry.register(new ThrowingAction());
    const executor = new ActionExecutor(store, bus, registry);

    await expect(executor.execute({ id: 'y', type: 'THROW_SYNC', params: {} })).rejects.toThrowError('fail');
  });
});
