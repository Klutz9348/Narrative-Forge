
import { create } from 'zustand';
import { StoryAsset, NodeType, NarrativeNode, Edge } from '../types';
import { CommandBus } from '../engine/CommandBus';
import { AssetManager } from '../engine/AssetManager';
import { SelectionManager } from '../engine/SelectionManager';
import { UpdateNodeCommand, AddNodeCommand, RemoveNodeCommand } from '../engine/commands';

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
  
  // Transient state for editing
  editingNodeId: string | null;
  originalNodeData: NarrativeNode | null;

  // Actions
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  
  // Node Manipulation
  // Direct/Transient update (for high frequency events like dragging/typing)
  updateNode: (id: string, data: Partial<NarrativeNode>) => void;
  
  // Transactional Actions (start/commit edits to create Commands)
  startEditing: (id: string) => void;
  commitEditing: () => void;
  
  // Structural Actions
  addNode: (type: NodeType, position: {x:number, y:number}) => void;
  removeNode: (id: string) => void;

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
  
  // Helper to trigger UI update after command execution
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
                originalNodeData: { ...activeSeg.nodes[id] } // Shallow clone sufficient for now
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
        
        // Detect if changes actually happened
        // Simple JSON stringify comparison for MVP
        if (JSON.stringify(originalNodeData) !== JSON.stringify(currentNodeData)) {
            const command = new UpdateNodeCommand(
                editingNodeId,
                originalNodeData,
                currentNodeData,
                activeSeg.id,
                set
            );
            // We don't execute() because the state is already updated (transiently)
            // But we need to register it in the stack. 
            // Wait, standard Command pattern requires execute() to do the work.
            // But here the work is done. 
            // We can treat the 'execute' as idempotent or simply push to stack manually?
            // CommandBus.execute calls execute().
            // Let's allow the command to re-set the state (it's safe).
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
        const command = new RemoveNodeCommand(id, node, activeSeg.id, set);
        commandBus.execute(command);
        syncCommandState();
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
