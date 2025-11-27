import { create } from 'zustand';
import { StoryAsset, NodeType, NarrativeNode, Edge } from '../types';

// --- Initial Data ---

const INITIAL_STORY: StoryAsset = {
  id: 'story_1',
  title: '赛博东京之影',
  description: '发生在霓虹闪烁的未来的黑色侦探惊悚片。',
  activeSegmentId: 'seg_1',
  characters: [
    { id: 'char_1', name: 'K 探员', avatarUrl: 'https://picsum.photos/id/64/200/200' },
    { id: 'char_2', name: 'ARIA (AI)', avatarUrl: 'https://picsum.photos/id/237/200/200' }
  ],
  segments: [
    {
      id: 'seg_1',
      name: '第一章：来电',
      rootNodeId: 'node_1',
      nodes: {
        'node_1': {
          id: 'node_1',
          type: NodeType.LOCATION,
          name: 'K 的办公室',
          position: { x: 100, y: 100 },
          size: { x: 400, y: 300 },
          backgroundImage: 'https://picsum.photos/id/180/800/600',
          hotspots: []
        } as NarrativeNode,
        'node_2': {
          id: 'node_2',
          type: NodeType.DIALOGUE,
          name: '开场独白',
          position: { x: 600, y: 200 },
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
          type: NodeType.DIALOGUE,
          name: '接听电话',
          position: { x: 1000, y: 100 },
          size: { x: 300, y: 150 },
          characterId: 'char_1',
          text: '这里是 K。说吧。',
          choices: []
        } as NarrativeNode,
        'node_4': {
          id: 'node_4',
          type: NodeType.DIALOGUE,
          name: '忽略电话',
          position: { x: 1000, y: 400 },
          size: { x: 300, y: 150 },
          characterId: 'char_1',
          text: '（继续抽烟，看着窗外的雨）',
          choices: []
        } as NarrativeNode
      },
      edges: [
        { id: 'e1', sourceNodeId: 'node_1', targetNodeId: 'node_2' },
        { id: 'e2', sourceNodeId: 'node_2', sourceHandleId: 'c1', targetNodeId: 'node_3' },
        { id: 'e3', sourceNodeId: 'node_2', sourceHandleId: 'c2', targetNodeId: 'node_4' }
      ]
    }
  ]
};

interface EditorState {
  story: StoryAsset;
  selectedIds: string[];
  canvasTransform: { x: number; y: number; scale: number };
  
  // History for Undo/Redo (Deep Cloned)
  history: StoryAsset[];
  historyIndex: number;

  // Actions
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  updateNode: (id: string, data: Partial<NarrativeNode>) => void;
  setCanvasTransform: (transform: { x: number; y: number; scale: number }) => void;
  
  // History Actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  story: INITIAL_STORY,
  selectedIds: [],
  canvasTransform: { x: 0, y: 0, scale: 1 },
  
  // Initialize history with a deep copy to prevent reference issues
  history: [JSON.parse(JSON.stringify(INITIAL_STORY))],
  historyIndex: 0,

  selectNode: (id, multi = false) => set(state => {
    if (!id) return { selectedIds: [] };
    return {
      selectedIds: multi ? [...state.selectedIds, id] : [id]
    };
  }),

  clearSelection: () => set({ selectedIds: [] }),

  updateNode: (nodeId, data) => {
    set(state => {
      const activeSeg = state.story.segments.find(s => s.id === state.story.activeSegmentId);
      if (!activeSeg) return state;

      if (!activeSeg.nodes[nodeId]) return state;

      const updatedSeg = {
        ...activeSeg,
        nodes: {
          ...activeSeg.nodes,
          [nodeId]: { ...activeSeg.nodes[nodeId], ...data }
        }
      };

      const newStory = {
        ...state.story,
        // Fix: Only update the active segment
        segments: state.story.segments.map(s => s.id === activeSeg.id ? updatedSeg : s)
      };

      return { story: newStory };
    });
  },

  setCanvasTransform: (transform) => set({ canvasTransform: transform }),

  pushHistory: () => set(state => {
    // Deep clone the current story to isolate history state
    const snapshot = JSON.parse(JSON.stringify(state.story));
    
    // Discard any future history if we are in the middle of the stack
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(snapshot);
    
    // Simple limit to prevent memory issues
    if (newHistory.length > 50) newHistory.shift();
    
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  undo: () => set(state => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      // Restore a deep copy to ensure the history record itself isn't mutated by subsequent edits
      const restoredStory = JSON.parse(JSON.stringify(state.history[newIndex]));
      return {
        story: restoredStory,
        historyIndex: newIndex
      };
    }
    return state;
  }),

  redo: () => set(state => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      // Restore a deep copy
      const restoredStory = JSON.parse(JSON.stringify(state.history[newIndex]));
      return {
        story: restoredStory,
        historyIndex: newIndex
      };
    }
    return state;
  })
}));