import { create } from 'zustand';
import { StoryAsset, NodeType, NarrativeNode, Edge, GlobalVariable, AttributeDefinition, CharacterAsset, Item, Clue, EditorTab, TabType, ScriptActionType, VoteNode, ShopDefinition } from '../types';
import { CommandBus } from '../engine/CommandBus';
import { AssetManager } from '../engine/AssetManager';
import { SelectionManager } from '../engine/SelectionManager';
import { UpdateNodeCommand, AddNodeCommand, RemoveNodeCommand, AddEdgeCommand, RemoveEdgeCommand, BatchUpdateNodesCommand, BatchDeleteEntitiesCommand } from '../engine/commands';
import { ICommand } from '../engine/interfaces';

// --- Initial Data ---

const EMPTY_STORY: StoryAsset = {
  id: 'story_empty',
  title: '',
  description: '',
  activeSegmentId: '',
  globalVariables: [],
  attributes: [],
  characters: [],
  items: [],
  shops: [],
  clues: [],
  segments: []
};

// Initial Tabs
const INITIAL_TABS: EditorTab[] = [
  { id: 'canvas', type: 'canvas', label: '故事画板' }
];

interface EditorState {
  story: StoryAsset;
  selectedIds: string[];
  canvasTransform: { x: number; y: number; scale: number };
  isStoryLoading: boolean;
  loadSampleStory: () => Promise<void>;
  
  // Tab State
  tabs: EditorTab[];
  activeTabId: string;
  openTab: (type: TabType, id?: string, label?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Transient state for editing
  editingNodeId: string | null;
  originalNodeData: NarrativeNode | null;

  // Actions
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  
  // Node Manipulation
  updateNode: (id: string, data: Partial<NarrativeNode>) => void;
  updateNodes: (updates: { id: string; data: Partial<NarrativeNode> }[]) => void;
  startEditing: (id: string) => void;
  commitEditing: () => void;
  commitBatchUpdate: (updates: { id: string; oldData: Partial<NarrativeNode>; newData: Partial<NarrativeNode> }[]) => void;
  
  // CRUD
  addNode: (type: NodeType, position: {x:number, y:number}) => void;
  removeNode: (id: string) => void;
  addEdge: (sourceId: string, targetId: string, sourceHandleId?: string) => void;
  removeEdge: (id: string) => void;
  deleteSelection: () => void;
  
  // Attribute CRUD (Replaces Global Variables)
  addAttribute: () => void;
  updateAttribute: (id: string, data: Partial<AttributeDefinition>) => void;
  removeAttribute: (id: string) => void;

  // Character CRUD
  addCharacter: () => void;
  updateCharacter: (id: string, data: Partial<CharacterAsset>) => void;
  removeCharacter: (id: string) => void;

  // Item CRUD
  addItem: () => void;
  updateItem: (id: string, data: Partial<Item>) => void;
  removeItem: (id: string) => void;

  // Shop CRUD
  addShop: () => void;
  updateShop: (id: string, data: Partial<ShopDefinition>) => void;
  removeShop: (id: string) => void;

  // Clue CRUD
  addClue: () => void;
  updateClue: (id: string, data: Partial<Clue>) => void;
  removeClue: (id: string) => void;

  setCanvasTransform: (transform: { x: number; y: number; scale: number }) => void;
  
  // Command Bus
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Instantiate core systems
const commandBus = new CommandBus();
const loadSampleStoryAsset = () => import('../engine/sample_story.json').then(mod => mod.default as StoryAsset);

export const useEditorStore = create<EditorState>((set, get) => {
  
  const syncCommandState = () => {
    set({ 
      canUndo: commandBus.canUndo(),
      canRedo: commandBus.canRedo()
    });
  };

  const selectionManager = new SelectionManager(
    () => get().selectedIds,
    (ids) => set({ selectedIds: ids })
  );

  return {
    story: EMPTY_STORY,
    isStoryLoading: false,
    selectedIds: [],
    canvasTransform: { x: 0, y: 0, scale: 1 },
    loadSampleStory: async () => {
      if (get().isStoryLoading) return;
      set({ isStoryLoading: true });
      try {
        const story = await loadSampleStoryAsset();
        set({ story, isStoryLoading: false });
      } catch (e) {
        console.error('[useEditorStore] Failed to load sample story', e);
        set({ isStoryLoading: false });
      }
    },
    
    // Tab System
    tabs: INITIAL_TABS,
    activeTabId: 'canvas',
    
    openTab: (type, id, label) => {
      const state = get();
      const tabId = id ? `${type}_${id}` : type; // Unique ID strategy
      
      const existingTab = state.tabs.find(t => t.id === tabId);
      if (existingTab) {
        set({ activeTabId: tabId });
        return;
      }
      
      const newTab: EditorTab = {
        id: tabId,
        type,
        label: label || 'New Tab',
        dataId: id
      };
      
      set({ 
        tabs: [...state.tabs, newTab],
        activeTabId: tabId 
      });
    },

    closeTab: (id) => {
      set(state => {
        if (id === 'canvas') return state; // Prevent closing canvas for now
        
        const newTabs = state.tabs.filter(t => t.id !== id);
        let newActiveId = state.activeTabId;
        
        // If closing active tab, switch to the last available
        if (state.activeTabId === id) {
          newActiveId = newTabs[newTabs.length - 1].id;
        }
        
        return { tabs: newTabs, activeTabId: newActiveId };
      });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    editingNodeId: null,
    originalNodeData: null,
    canUndo: false,
    canRedo: false,

    selectNode: (id, multi) => selectionManager.select(id, multi),
    clearSelection: () => selectionManager.clear(),

    updateNode: (nodeId, data) => {
      set(state => {
        const activeSeg = state.story.segments.find(s => s.id === state.story.activeSegmentId);
        if (!activeSeg || !activeSeg.nodes[nodeId]) return state;

        const updatedSeg = {
          ...activeSeg,
          nodes: {
            ...activeSeg.nodes,
            [nodeId]: { ...activeSeg.nodes[nodeId], ...data }
          }
        };

        const newStory = {
          ...state.story,
          segments: state.story.segments.map(s => s.id === activeSeg.id ? updatedSeg : s)
        };

        return { story: newStory };
      });
    },
    updateNodes: (updates) => {
      if (!updates || updates.length === 0) return;
      set(state => {
        const activeSeg = state.story.segments.find(s => s.id === state.story.activeSegmentId);
        if (!activeSeg) return state;
        const newNodes = { ...activeSeg.nodes };
        updates.forEach(u => {
          const node = newNodes[u.id];
          if (node) newNodes[u.id] = { ...node, ...u.data };
        });
        const newSegments = state.story.segments.map(s => s.id === activeSeg.id ? { ...activeSeg, nodes: newNodes } : s);
        return { story: { ...state.story, segments: newSegments } };
      });
    },

    startEditing: (id: string) => {
        const state = get();
        const activeSeg = state.story.segments.find(s => s.id === state.story.activeSegmentId);
        if (activeSeg && activeSeg.nodes[id]) {
            set({ 
                editingNodeId: id, 
                originalNodeData: { ...activeSeg.nodes[id] } // Shallow clone
            });
        }
    },

    commitEditing: () => {
        const state = get();
        const { editingNodeId, originalNodeData, story } = state;
        
        if (!editingNodeId || !originalNodeData) return;

        const activeSeg = story.segments.find(s => s.id === story.activeSegmentId);
        if (!activeSeg) return;

        const currentNodeData = activeSeg.nodes[editingNodeId];
        
        if (JSON.stringify(originalNodeData) !== JSON.stringify(currentNodeData)) {
            const command = new UpdateNodeCommand(
                editingNodeId,
                originalNodeData,
                currentNodeData,
                activeSeg.id,
                set
            );
            commandBus.execute(command);
            syncCommandState();
        }

        set({ editingNodeId: null, originalNodeData: null });
    },

    commitBatchUpdate: (updates) => {
        if (!updates || updates.length === 0) return;
        const state = get();
        const segmentId = state.story.activeSegmentId;
        const batch = new BatchUpdateNodesCommand(updates, segmentId, set);
        commandBus.execute(batch);
        syncCommandState();
        set({ editingNodeId: null, originalNodeData: null });
    },

    addNode: (type, position) => {
        const state = get();
        const newNode = AssetManager.createNode(type, position);
        const command = new AddNodeCommand(newNode, state.story.activeSegmentId, set);
        commandBus.execute(command);
        syncCommandState();
    },

    removeNode: (id) => {
        const state = get();
        const activeSeg = state.story.segments.find(s => s.id === state.story.activeSegmentId);
        if (!activeSeg || !activeSeg.nodes[id]) return;
        
        const node = activeSeg.nodes[id];

        // PROTECT START NODE
        if (node.type === NodeType.START) return;

        const command = new RemoveNodeCommand(id, node, activeSeg.id, set);
        commandBus.execute(command);
        syncCommandState();
    },

    addEdge: (sourceId: string, targetId: string, sourceHandleId?: string) => {
      const state = get();
      const activeSeg = state.story.segments.find(s => s.id === state.story.activeSegmentId);
      if (!activeSeg) return;

      const exists = activeSeg.edges.some(e => 
          e.sourceNodeId === sourceId && 
          e.targetNodeId === targetId && 
          e.sourceHandleId === sourceHandleId
      );
      if (exists) return;

      const newEdge = AssetManager.createEdge(sourceId, targetId, sourceHandleId);
      const command = new AddEdgeCommand(newEdge, activeSeg.id, set);
      commandBus.execute(command);
      syncCommandState();
    },

    removeEdge: (id: string) => {
        const state = get();
        const activeSeg = state.story.segments.find(s => s.id === state.story.activeSegmentId);
        if (!activeSeg) return;
        const edge = activeSeg.edges.find(e => e.id === id);
        if (!edge) return;

        const command = new RemoveEdgeCommand(id, edge, activeSeg.id, set);
        commandBus.execute(command);
        syncCommandState();
    },

    deleteSelection: () => {
        const state = get();
        const { selectedIds, story } = state;
        if (selectedIds.length === 0) return;

        const activeSeg = story.segments.find(s => s.id === story.activeSegmentId);
        if (!activeSeg) return;

        const nodesToDelete: NarrativeNode[] = [];
        const edgesToDelete: Edge[] = [];

        selectedIds.forEach(id => {
            if (activeSeg.nodes[id]) {
                const node = activeSeg.nodes[id];
                if (node.type === NodeType.START) return;
                nodesToDelete.push(node);
            } else {
                const edge = activeSeg.edges.find(e => e.id === id);
                if (edge) edgesToDelete.push(edge);
            }
        });

        if (nodesToDelete.length || edgesToDelete.length) {
            const batch = new BatchDeleteEntitiesCommand(activeSeg.id, nodesToDelete, edgesToDelete, set);
            commandBus.execute(batch);
            syncCommandState();
        }
        state.clearSelection();
    },

    // --- Attribute CRUD ---
    addAttribute: () => {
        set(state => {
            const newAttr: AttributeDefinition = {
                id: `attr_${Date.now()}`,
                key: 'new_stat',
                name: 'New Attribute',
                type: 'number',
                defaultValue: 0,
                min: 0,
                max: 100
            };
            return { story: { ...state.story, attributes: [...state.story.attributes, newAttr] } };
        });
    },
    updateAttribute: (id, data) => {
        set(state => ({
            story: {
                ...state.story,
                attributes: state.story.attributes.map(a => a.id === id ? { ...a, ...data } : a)
            }
        }));
    },
    removeAttribute: (id) => {
        set(state => ({
            story: { ...state.story, attributes: state.story.attributes.filter(a => a.id !== id) }
        }));
    },

    // --- Character CRUD ---
    addCharacter: () => {
        set(state => {
            const newChar = {
                id: `char_${Date.now()}`,
                name: '新角色',
                avatarUrl: 'https://picsum.photos/200',
                description: ''
            };
            const tabId = `character_${newChar.id}`;
            return {
                story: {
                    ...state.story,
                    characters: [...state.story.characters, newChar]
                },
                tabs: [...state.tabs, { id: tabId, type: 'character', label: newChar.name, dataId: newChar.id }],
                activeTabId: tabId
            };
        });
    },
    updateCharacter: (id, data) => {
        set(state => {
             const newStory = {
                ...state.story,
                characters: state.story.characters.map(c => c.id === id ? { ...c, ...data } : c)
            };
            const newTabs = state.tabs.map(t => t.dataId === id ? { ...t, label: data.name || t.label } : t);
            return { story: newStory, tabs: newTabs };
        });
    },
    removeCharacter: (id) => {
        set(state => ({
            story: { ...state.story, characters: state.story.characters.filter(c => c.id !== id) },
            tabs: state.tabs.filter(t => t.dataId !== id),
            activeTabId: state.activeTabId === `character_${id}` ? 'canvas' : state.activeTabId
        }));
    },

    // --- Item CRUD ---
    addItem: () => {
         set(state => {
            const newItem = {
                id: `item_${Date.now()}`,
                name: '新道具',
                description: '描述...',
            };
            const tabId = `item_${newItem.id}`;
            return {
                story: {
                    ...state.story,
                    items: [...state.story.items, newItem]
                },
                tabs: [...state.tabs, { id: tabId, type: 'item', label: newItem.name, dataId: newItem.id }],
                activeTabId: tabId
            };
        });
    },
    updateItem: (id, data) => {
         set(state => {
             const newStory = {
                ...state.story,
                items: state.story.items.map(i => i.id === id ? { ...i, ...data } : i)
            };
            const newTabs = state.tabs.map(t => t.dataId === id ? { ...t, label: data.name || t.label } : t);
            return { story: newStory, tabs: newTabs };
        });
    },
    removeItem: (id) => {
        set(state => ({
            story: { ...state.story, items: state.story.items.filter(i => i.id !== id) },
             tabs: state.tabs.filter(t => t.dataId !== id),
            activeTabId: state.activeTabId === `item_${id}` ? 'canvas' : state.activeTabId
        }));
    },

    // --- Shop CRUD ---
    addShop: () => {
         set(state => {
            const newShop = {
                id: `shop_${Date.now()}`,
                name: '新商店',
                description: '神秘的交易场所...',
                inventory: []
            };
            const tabId = `shop_${newShop.id}`;
            return {
                story: {
                    ...state.story,
                    shops: [...(state.story.shops || []), newShop]
                },
                tabs: [...state.tabs, { id: tabId, type: 'shop', label: newShop.name, dataId: newShop.id }],
                activeTabId: tabId
            };
        });
    },
    updateShop: (id, data) => {
         set(state => {
             const newStory = {
                ...state.story,
                shops: (state.story.shops || []).map(s => s.id === id ? { ...s, ...data } : s)
            };
            const newTabs = state.tabs.map(t => t.dataId === id ? { ...t, label: data.name || t.label } : t);
            return { story: newStory, tabs: newTabs };
        });
    },
    removeShop: (id) => {
        set(state => ({
            story: { ...state.story, shops: (state.story.shops || []).filter(s => s.id !== id) },
             tabs: state.tabs.filter(t => t.dataId !== id),
            activeTabId: state.activeTabId === `shop_${id}` ? 'canvas' : state.activeTabId
        }));
    },

    // --- Clue CRUD ---
    addClue: () => {
         set(state => {
            const newClue = {
                id: `clue_${Date.now()}`,
                name: '新线索',
                description: '描述...',
                revealed: false
            };
            const tabId = `clue_${newClue.id}`;
            return {
                story: {
                    ...state.story,
                    clues: [...state.story.clues, newClue]
                },
                tabs: [...state.tabs, { id: tabId, type: 'clue', label: newClue.name, dataId: newClue.id }],
                activeTabId: tabId
            };
        });
    },
    updateClue: (id, data) => {
        set(state => {
             const newStory = {
                ...state.story,
                clues: state.story.clues.map(c => c.id === id ? { ...c, ...data } : c)
            };
            const newTabs = state.tabs.map(t => t.dataId === id ? { ...t, label: data.name || t.label } : t);
            return { story: newStory, tabs: newTabs };
        });
    },
    removeClue: (id) => {
        set(state => ({
            story: { ...state.story, clues: state.story.clues.filter(c => c.id !== id) },
            tabs: state.tabs.filter(t => t.dataId !== id),
            activeTabId: state.activeTabId === `clue_${id}` ? 'canvas' : state.activeTabId
        }));
    },

    setCanvasTransform: (transform) => set({ canvasTransform: transform }),

    undo: () => {
        commandBus.undo();
        syncCommandState();
    },
    redo: () => {
        commandBus.redo();
        syncCommandState();
    }
  };
});

// Auto-load sample story asynchronously to avoid bundling大块初始数据到主包
useEditorStore.getState().loadSampleStory();
