
// --- Basic Types ---
export type Vector2 = { x: number; y: number };

// --- Asset Layer ---

export enum NodeType {
  DIALOGUE = 'DIALOGUE',
  LOCATION = 'LOCATION',
  BRANCH = 'BRANCH',
  JUMP = 'JUMP',
  SET_VARIABLE = 'SET_VARIABLE',
  ACTION = 'ACTION', // New: Script/Action Node
}

export interface NodeData {
  id: string;
  type: NodeType;
  name: string;
  position: Vector2;
  size: Vector2;
  parentId?: string; // Hierarchical support
  // Visual specific: does this node have dynamic outputs?
  childrenIds?: string[]; // Deprecated in favor of edges, kept for compatibility if needed
}

export interface DialogueNode extends NodeData {
  type: NodeType.DIALOGUE;
  characterId: string;
  text: string;
  choices: { id: string; text: string; nextNodeId?: string }[];
  
  // Add-ons (Optional Modules)
  voiceId?: string;
  expression?: string;
  placement?: 'left' | 'center' | 'right';
}

// Event System Types
export type NodeEventType = 'lifecycle' | 'interaction';
export type NodeEventTrigger = 'onEnter' | 'onExit' | 'onClick';

export interface NodeEvent {
  id: string;
  type: NodeEventType;
  trigger: NodeEventTrigger;
  label: string;
  targetId?: string; // e.g., hotspotId for 'onClick' events
}

export interface Hotspot {
  id: string;
  name: string;
  rect: { x: number; y: number; w: number; h: number }; // percentage 0-100 relative to node size or image container
  image?: string; // Optional overlay image for the hotspot
}

export interface LocationNode extends NodeData {
  type: NodeType.LOCATION;
  backgroundImage: string;
  
  // Add-ons (Optional Modules)
  hotspots: Hotspot[]; // Define the geometric areas
  events: NodeEvent[]; // Define logic ports (OnEnter, OnClick Hotspot A, etc.)
  
  bgm?: string;
  filter?: string;
}

// 新增：分支节点
export interface BranchNode extends NodeData {
  type: NodeType.BRANCH;
  // 分支条件列表
  conditions: {
    id: string;
    expression: string; // 例如: "coin >= 5" 或 "hasKey == true"
    // 注意：实际的连接关系存储在 SegmentAsset.edges 中，这里的 ID 主要用于 UI 对应
  }[];
  
  // Add-ons (Optional Modules)
  defaultNextNodeId?: string; // Else path
}

// 新增：变量设置节点
export interface VariableSetterNode extends NodeData {
  type: NodeType.SET_VARIABLE;
  variableName: string;   // 要修改的变量名，如 "coin"
  operator: 'SET' | 'ADD' | 'SUB'; // 操作符：赋值、加、减
  value: string;          // 值，如 "10", "true", "player_name"
  
  // Add-ons
  isAdvanced?: boolean; // If true, value is treated as an expression formula
}

// 新增：跳转节点 (跨章节)
export interface JumpNode extends NodeData {
  type: NodeType.JUMP;
  targetSegmentId: string; // 跳转到的目标章节 ID
}

// 新增：动作/脚本节点
export type ActionCommandType = 'playSound' | 'wait' | 'screenShake' | 'showToast';

export interface ActionCommand {
  id: string;
  type: ActionCommandType;
  params: Record<string, any>;
}

export interface ActionNode extends NodeData {
  type: NodeType.ACTION;
  commands: ActionCommand[];
}

// 更新 NarrativeNode 联合类型
export type NarrativeNode = 
  | DialogueNode 
  | LocationNode 
  | BranchNode 
  | VariableSetterNode 
  | JumpNode 
  | ActionNode
  | NodeData;

export interface Edge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandleId?: string; // For nodes with multiple outputs (e.g. choices, branches, events)
  condition?: string; // Expression string, e.g. "sanity > 50"
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
  // 新增：全局变量定义 (为后续做准备)
  globalVariables?: Record<string, any>; 
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
