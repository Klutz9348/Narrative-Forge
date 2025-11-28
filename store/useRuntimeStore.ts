
import { create } from 'zustand';
import { NarrativeNode, Item, AttributeDefinition, LocationNode } from '../types';

interface LogEntry {
  id: string;
  speaker?: string;
  text: string;
}

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
}

interface RuntimeState {
  isRunning: boolean;
  isPaused: boolean;
  
  // UI Visibility
  showInventory: boolean;
  activeShopId: string | null;
  
  // Narrative State Sync
  currentNode: NarrativeNode | null;
  currentScene: LocationNode | null;
  lastLocationBackground?: string;
  history: LogEntry[];
  
  // RPG State Sync
  attributes: Record<string, any>;
  inventory: Record<string, number>; // itemId -> count
  
  // Feedback
  toasts: Toast[];

  // Actions
  setIsRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setCurrentNode: (node: NarrativeNode | null) => void;
  setCurrentScene: (scene: LocationNode | null) => void;
  setLastLocationBackground: (url?: string) => void;
  toggleInventory: () => void;
  openShop: (shopId: string) => void;
  closeShop: () => void;
  
  addHistory: (entry: LogEntry) => void;
  syncAttributes: (attrs: Record<string, any>) => void;
  syncInventory: (inv: Record<string, number>) => void;
  
  showToast: (message: string) => void;
  removeToast: (id: string) => void;
  
  reset: () => void;
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  isRunning: false,
  isPaused: false,
  showInventory: false,
  activeShopId: null,
  
  currentNode: null,
  currentScene: null,
  lastLocationBackground: undefined,
  history: [],
  attributes: {},
  inventory: {},
  toasts: [],

  setIsRunning: (running) => set({ isRunning: running }),
  setPaused: (paused) => set({ isPaused: paused }),
  
  setCurrentNode: (node) => set({ currentNode: node }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setLastLocationBackground: (url) => set({ lastLocationBackground: url }),
  
  toggleInventory: () => set((state) => ({ showInventory: !state.showInventory })),
  openShop: (shopId) => set({ activeShopId: shopId }),
  closeShop: () => set({ activeShopId: null }),

  addHistory: (entry) => set((state) => ({ 
    history: [...state.history, entry].slice(-50) 
  })),

  syncAttributes: (attrs) => set({ attributes: attrs }),
  syncInventory: (inv) => set({ inventory: inv }),

  showToast: (message) => {
    const id = Math.random().toString(36);
    set((state) => ({ toasts: [...state.toasts, { id, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  reset: () => set({
    currentNode: null,
    currentScene: null,
    lastLocationBackground: undefined,
    history: [],
    attributes: {},
    inventory: {},
    toasts: [],
    showInventory: false,
    activeShopId: null,
    isPaused: false
  })
}));
