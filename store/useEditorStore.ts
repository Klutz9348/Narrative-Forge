
import { create } from 'zustand';
import { StoryAsset, NodeType, NarrativeNode, Edge, GlobalVariable, AttributeDefinition, CharacterAsset, Item, Clue, EditorTab, TabType, ScriptActionType, VoteNode, ShopDefinition } from '../types';
import { CommandBus } from '../engine/CommandBus';
import { AssetManager } from '../engine/AssetManager';
import { SelectionManager } from '../engine/SelectionManager';
import { UpdateNodeCommand, AddNodeCommand, RemoveNodeCommand, AddEdgeCommand, RemoveEdgeCommand } from '../engine/commands';

// --- Initial Data ---

const INITIAL_STORY: StoryAsset = {
  id: 'story_1',
  title: '赛博东京之影',
  description: '发生在霓虹闪烁的未来的黑色侦探惊悚片。',
  activeSegmentId: 'seg_1',
  // Legacy support
  globalVariables: [], 
  // New RPG Attributes
  attributes: [
    { 
        id: 'attr_sanity', 
        key: 'sanity', 
        name: '理智值 (Sanity)', 
        type: 'number', 
        defaultValue: 100, 
        min: 0, 
        max: 100, 
        description: '角色的精神健康状态，归零时游戏结束。' 
    },
    { 
        id: 'attr_coin', 
        key: 'coin', 
        name: '新日元 (Credits)', 
        type: 'number', 
        defaultValue: 500,
        min: 0,
        description: '通用货币，用于购买道具。'
    },
    { 
        id: 'attr_haskey', 
        key: 'hasKey', 
        name: '拥有密匙', 
        type: 'boolean', 
        defaultValue: false 
    },
  ],
  characters: [
    { id: 'char_1', name: 'K 探员', avatarUrl: 'https://picsum.photos/id/64/200/200', description: '一位从不睡觉的私家侦探。' },
    { id: 'char_2', name: 'ARIA (AI)', avatarUrl: 'https://picsum.photos/id/237/200/200', description: '你的全息助理。' }
  ],
  items: [
    { id: 'item_1', name: '生锈的钥匙', description: '看起来很久没用了，也许能打开旧城区的某扇门。' },
    { 
        id: 'item_2', 
        name: '万能解码器', 
        description: '黑客工具，需要电池驱动。',
        recipe: {
            ingredients: [
                { itemId: 'item_3', count: 1 },
            ],
            costAttribute: { attributeId: 'attr_coin', amount: 50 }
        }
    },
    { id: 'item_3', name: '废旧电池', description: '虽然旧了点，但还有电。' }
  ],
  shops: [
      {
          id: 'shop_1',
          name: '黑市 (Dark Web)',
          description: '只有最绝望的人才会来这里交易。',
          inventory: [
              { itemId: 'item_2', price: 200, currencyAttributeId: 'attr_coin' },
              { itemId: 'item_3', price: 50, currencyAttributeId: 'attr_coin' }
          ]
      }
  ],
  clues: [
    { id: 'clue_1', name: '神秘电话', description: '电话那头的声音经过了变声处理，提到“午夜钟声”。', revealed: true, owners: ['char_1'] },
    { id: 'clue_2', name: '湿润的脚印', description: '办公室门口有一串未干的脚印，尺寸很大。', revealed: false, owners: [] }
  ],
  segments: [
    {
      id: 'seg_1',
      name: '第一章：来电',
      rootNodeId: 'node_start',
      nodes: {
        'node_start': {
          id: 'node_start',
          type: NodeType.START,
          name: 'Start',
          position: { x: 50, y: 220 },
          size: { x: 120, y: 60 }
        } as NarrativeNode,
        'node_1': {
          id: 'node_1',
          type: NodeType.LOCATION,
          name: 'K 的办公室',
          position: { x: 250, y: 100 },
          size: { x: 400, y: 300 },
          backgroundImage: 'https://picsum.photos/id/180/800/600',
          hotspots: [],
          events: [
            { 
                id: 'evt_1', 
                type: 'lifecycle', 
                trigger: 'onEnter', 
                label: '进入时 (Auto)',
                actions: [
                    { 
                        id: 'act_1', 
                        type: ScriptActionType.UPDATE_ATTRIBUTE, 
                        params: { attributeId: 'attr_sanity', op: 'add', value: -5 } 
                    },
                    {
                        id: 'act_2',
                        type: ScriptActionType.SHOW_TOAST,
                        params: { message: '感觉一阵寒意... (Sanity -5)' }
                    }
                ] 
            }
          ]
        } as NarrativeNode,
        'node_2': {
          id: 'node_2',
          type: NodeType.DIALOGUE,
          name: '开场独白',
          position: { x: 750, y: 200 },
          size: { x: 300, y: 180 },
          characterId: 'char_1',
          text: '雨……这座城市的雨从未停歇。',
          choices: [
            { id: 'c1', text: '接听电话' },
            { id: 'c2', text: '忽略它' }
          ]
        } as NarrativeNode,
         'node_3': {
          id: 'node_3',
          type: NodeType.VOTE,
          name: '抉择时刻',
          position: { x: 1150, y: 100 },
          size: { x: 300, y: 200 },
          voteConfig: {
              title: "接听还是挂断？",
              duration: 15,
              options: [
                  { id: 'v1', text: '接听', score: 10, isCorrect: true },
                  { id: 'v2', text: '挂断', score: 0, isCorrect: false }
              ],
              strategy: 'majority'
          }
        } as VoteNode,
        'node_4': {
          id: 'node_4',
          type: NodeType.DIALOGUE,
          name: '忽略电话',
          position: { x: 1150, y: 400 },
          size: { x: 300, y: 150 },
          characterId: 'char_1',
          text: '（继续抽烟，看着窗外的雨）',
          choices: []
        } as NarrativeNode
      },
      edges: [
        { id: 'e_start', sourceNodeId: 'node_start', targetNodeId: 'node_1' },
        { id: 'e1', sourceNodeId: 'node_1', sourceHandleId: 'evt_1', targetNodeId: 'node_2' },
        { id: 'e2', sourceNodeId: 'node_2', sourceHandleId: 'c1', targetNodeId: 'node_3' },
        { id: 'e3', sourceNodeId: 'node_2', sourceHandleId: 'c2', targetNodeId: 'node_4' }
      ]
    }
  ]
};

// Initial Tabs
const INITIAL_TABS: EditorTab[] = [
  { id: 'canvas', type: 'canvas', label: '故事画板' }
];

interface EditorState {
  story: StoryAsset;
  selectedIds: string[];
  canvasTransform: { x: number; y: number; scale: number };
  
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
  startEditing: (id: string) => void;
  commitEditing: () => void;
  
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
    story: INITIAL_STORY,
    selectedIds: [],
    canvasTransform: { x: 0, y: 0, scale: 1 },
    
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

        selectedIds.forEach(id => {
            if (activeSeg.nodes[id]) {
                const node = activeSeg.nodes[id];
                // PROTECT START NODE
                if (node.type === NodeType.START) return;

                const command = new RemoveNodeCommand(id, node, activeSeg.id, set);
                commandBus.execute(command);
            } else {
                const edge = activeSeg.edges.find(e => e.id === id);
                if (edge) {
                    const command = new RemoveEdgeCommand(id, edge, activeSeg.id, set);
                    commandBus.execute(command);
                }
            }
        });
        
        state.clearSelection();
        syncCommandState();
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