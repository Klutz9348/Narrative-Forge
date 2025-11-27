// --- Basic Types ---
export type Vector2 = { x: number; y: number };

// --- Asset Layer ---

export enum NodeType {
  DIALOGUE = 'DIALOGUE',
  LOCATION = 'LOCATION',
  BRANCH = 'BRANCH',
  JUMP = 'JUMP',
}

export interface NodeData {
  id: string;
  type: NodeType;
  name: string;
  position: Vector2;
  size: Vector2;
  // Visual specific: does this node have dynamic outputs?
  childrenIds?: string[]; // Deprecated in favor of edges, kept for compatibility if needed
}

export interface DialogueNode extends NodeData {
  type: NodeType.DIALOGUE;
  characterId: string;
  text: string;
  choices: { id: string; text: string; nextNodeId?: string }[];
}

export interface LocationNode extends NodeData {
  type: NodeType.LOCATION;
  backgroundImage: string;
  hotspots: { id: string; rect: { x: number; y: number; w: number; h: number }; action: string }[];
}

export type NarrativeNode = DialogueNode | LocationNode | NodeData;

export interface Edge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandleId?: string; // For nodes with multiple outputs (e.g. choices)
}

export interface SegmentAsset {
  id: string;
  name: string;
  nodes: Record<string, NarrativeNode>;
  edges: Edge[];
  rootNodeId: string;
}

export interface CharacterAsset {
  id: string;
  name: string;
  avatarUrl: string;
  defaultVoice?: string;
}

export interface StoryAsset {
  id: string;
  title: string;
  description: string;
  segments: SegmentAsset[];
  characters: CharacterAsset[];
  activeSegmentId: string;
}

// --- Editor State ---

export interface EditorState {
  story: StoryAsset;
  selection: string[]; // IDs of selected nodes
  canvasTransform: {
    x: number;
    y: number;
    scale: number;
  };
  dragState: {
    isDragging: boolean;
    startX: number;
    startY: number;
    nodeId?: string; // If dragging a specific node
  } | null;
}
