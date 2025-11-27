
// --- Basic Types ---
export type Vector2 = { x: number; y: number };

// --- Asset Layer ---

export enum NodeType {
  START = 'START', // New: Entry point
  DIALOGUE = 'DIALOGUE',
  LOCATION = 'LOCATION',
  BRANCH = 'BRANCH',
  JUMP = 'JUMP',
  SET_VARIABLE = 'SET_VARIABLE', // Deprecated in favor of ActionNode logic, but kept for compatibility
  ACTION = 'ACTION', 
  VOTE = 'VOTE', // New: Multiplayer Vote
}

export interface NodeData {
  id: string;
  type: NodeType;
  name: string;
  position: Vector2;
  size: Vector2;
  parentId?: string; // Hierarchical support
  childrenIds?: string[]; 
}

export interface StartNode extends NodeData {
  type: NodeType.START;
}

export interface DialogueNode extends NodeData {
  type: NodeType.DIALOGUE;
  characterId: string;
  text: string;
  choices: { id: string; text: string; nextNodeId?: string }[];
  
  // Add-ons
  voiceId?: string;
  expression?: string;
  placement?: 'left' | 'center' | 'right';
}

// --- ECA System (Event-Condition-Action) ---

export enum ScriptActionType {
  UPDATE_ATTRIBUTE = 'UPDATE_ATTRIBUTE',
  ADD_ITEM = 'ADD_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  PLAY_SOUND = 'PLAY_SOUND',
  WAIT = 'WAIT',
  SCREEN_SHAKE = 'SCREEN_SHAKE',
  SHOW_TOAST = 'SHOW_TOAST',
  // Phase 3: Social & Knowledge
  ADD_CLUE = 'ADD_CLUE',
  REMOVE_CLUE = 'REMOVE_CLUE',
  SHARE_CLUE = 'SHARE_CLUE',
  // Phase 4: Interaction & Economy
  OPEN_SHOP = 'OPEN_SHOP',
  OPEN_CRAFTING = 'OPEN_CRAFTING'
}

export interface ScriptAction {
  id: string;
  type: ScriptActionType;
  params: Record<string, any>;
}

// Event System Types
export type NodeEventType = 'lifecycle' | 'interaction';
export type NodeEventTrigger = 'onEnter' | 'onExit' | 'onClick';

export interface NodeEvent {
  id: string;
  type: NodeEventType;
  trigger: NodeEventTrigger;
  label: string;
  targetId?: string; // e.g., hotspotId
  actions: ScriptAction[]; // The logic payload
}

export interface Hotspot {
  id: string;
  name: string;
  rect: { x: number; y: number; w: number; h: number }; 
  image?: string; 
}

export interface LocationNode extends NodeData {
  type: NodeType.LOCATION;
  backgroundImage: string;
  hotspots: Hotspot[]; 
  events: NodeEvent[]; 
  bgm?: string;
  filter?: string;
}

// Logic Types
export type LogicOperator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contains';
export type VariableType = 'boolean' | 'number' | 'string';

export interface LogicCondition {
  id: string;
  variableId: string;
  operator: LogicOperator;
  value: string; 
}

// Deprecated: Use AttributeDefinition instead
export interface GlobalVariable {
  id: string;
  name: string;
  type: VariableType;
  defaultValue: any;
}

// New: RPG Attribute Definition
export interface AttributeDefinition {
  id: string;
  key: string;      // e.g., 'sanity' (internal ref)
  name: string;     // e.g., '理智值' (display name)
  type: VariableType;
  defaultValue: any;
  min?: number;     // For number type
  max?: number;     // For number type
  icon?: string;    // Lucide icon name or URL
  description?: string;
}

// New: Item Crafting Recipe
export interface ItemRecipe {
  ingredients: { itemId: string; count: number }[];
  costAttribute?: { attributeId: string; amount: number }; // e.g., Cost 10 Coin
}

export interface Item {
  id: string;
  name: string;
  description: string;
  icon?: string;
  stackable?: boolean; // Can allow multiple?
  recipe?: ItemRecipe; // If present, this item can be crafted
}

// New: Shop Definition
export interface ShopItem {
  itemId: string;
  price: number;
  currencyAttributeId: string; // Which attribute pays for this? e.g. 'coin'
  stock?: number; // Infinite if undefined
}

export interface ShopDefinition {
  id: string;
  name: string;
  description?: string;
  background?: string;
  inventory: ShopItem[];
}

export interface Clue {
  id: string;
  name: string;
  description: string;
  revealed: boolean;
  owners?: string[]; // IDs of characters who have this clue
}

export interface BranchNode extends NodeData {
  type: NodeType.BRANCH;
  conditions: LogicCondition[];
  defaultNextNodeId?: string; 
}

export interface VariableSetterNode extends NodeData {
  type: NodeType.SET_VARIABLE;
  variableName: string;   
  operator: 'SET' | 'ADD' | 'SUB'; 
  value: string;          
  isAdvanced?: boolean; 
}

export interface JumpNode extends NodeData {
  type: NodeType.JUMP;
  targetSegmentId: string; 
}

export interface ActionNode extends NodeData {
  type: NodeType.ACTION;
  actions: ScriptAction[]; // Replaced legacy commands
}

// New: Vote Node
export interface VoteOption {
  id: string;
  text: string;
  isCorrect?: boolean; // For mystery solving
  score?: number;      // Points awarded
}

export interface VoteConfig {
  title: string;       // The question
  duration: number;    // Seconds
  options: VoteOption[];
  strategy: 'majority' | 'score' | 'branch'; // How to proceed
}

export interface VoteNode extends NodeData {
  type: NodeType.VOTE;
  voteConfig: VoteConfig;
}

export type NarrativeNode = 
  | StartNode
  | DialogueNode 
  | LocationNode 
  | BranchNode 
  | VariableSetterNode 
  | JumpNode 
  | ActionNode
  | VoteNode
  | NodeData;

export interface Edge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandleId?: string; 
  condition?: string; 
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
  description?: string;
}

export interface StoryAsset {
  id: string;
  title: string;
  description: string;
  segments: SegmentAsset[];
  characters: CharacterAsset[];
  items: Item[]; 
  shops: ShopDefinition[]; // New
  clues: Clue[]; 
  activeSegmentId: string;
  attributes: AttributeDefinition[]; 
  globalVariables: GlobalVariable[]; 
}

// --- Editor UI Types ---

export type TabType = 'canvas' | 'variable' | 'character' | 'item' | 'clue' | 'shop';

export interface EditorTab {
  id: string;
  type: TabType;
  label: string;
  dataId?: string; 
  icon?: any;
}

export interface EditorState {
  story: StoryAsset;
  selection: string[]; 
  canvasTransform: {
    x: number;
    y: number;
    scale: number;
  };
  dragState: {
    isDragging: boolean;
    startX: number;
    startY: number;
    nodeId?: string; 
  } | null;
}