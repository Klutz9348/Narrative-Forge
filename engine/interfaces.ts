
import { NarrativeNode, StoryAsset, AttributeDefinition, Clue, Item } from '../types';

/**
 * 事件总线接口
 * 用于引擎内部模块通信以及编辑器与运行时的联动
 */
export type EventCallback = (payload: any) => void;

export interface IEventBus {
  on(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void;
  emit(event: string, payload?: any): void;
}

/**
 * 场景图接口
 * 负责管理节点层级、查找与遍历
 */
export interface ISceneGraph {
  rootId: string;
  getNode(id: string): NarrativeNode | undefined;
  addNode(node: NarrativeNode): void;
  removeNode(id: string): void;
  
  // Hierarchy
  setParent(childId: string, parentId: string | undefined): void;
  getParent(childId: string): NarrativeNode | undefined;
  getChildren(parentId: string): NarrativeNode[];
  
  // Selection / API
  selectNode(id: string, exclusive?: boolean): void;
  getSelectedNodes(): NarrativeNode[];
  clearSelection(): void;

  loadSegment(nodes: Record<string, NarrativeNode>, rootId: string): void;
}

/**
 * 渲染器接口
 * 虽然目前使用 React DOM 渲染，但定义此接口是为了将来可能迁移到 Canvas/WebGL
 */
export interface IRenderer {
  render(scene: ISceneGraph): void;
  setZoom(scale: number): void;
  pan(x: number, y: number): void;
}

/**
 * 命令模式接口
 * 用于实现撤销/重做系统
 */
export interface ICommand {
  id: string;
  name: string;
  execute(): void;
  undo(): void;
}

export interface ICommandBus {
  execute(command: ICommand): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

/**
 * 变量存储接口
 * 管理游戏运行时的状态变量 (RPG State)
 */
export interface IVariableStore {
  setEventBus(eventBus: IEventBus): void;
  
  // Initialization
  init(story: StoryAsset): void;

  // Generic Getters
  getAll(): Record<string, any>;
  evaluateCondition(condition: string): boolean;

  // --- Attribute System ---
  setAttribute(key: string, value: any): void;
  getAttribute(key: string): any;
  modifyAttribute(key: string, operator: 'add' | 'sub' | 'set', value: number): void;

  // --- Inventory System ---
  addItem(itemId: string, count?: number): void;
  removeItem(itemId: string, count?: number): void;
  getItemCount(itemId: string): number;
  hasItem(itemId: string, count?: number): boolean;

  // --- Knowledge System (Clues) ---
  addClue(clueId: string, characterId?: string): void;
  removeClue(clueId: string, characterId?: string): void;
  shareClue(clueId: string, fromCharacterId: string, toCharacterId: string): void;
  hasClue(clueId: string, characterId?: string): boolean;
  isClueRevealed(clueId: string): boolean;
}

/**
 * 叙事引擎接口
 * 负责运行时的剧情推进
 */
export interface INarrativeEngine {
  variableStore: IVariableStore;
  eventBus: IEventBus;
  sceneGraph: ISceneGraph;

  loadStory(story: StoryAsset): void;
  
  /**
   * 开始运行指定段落
   */
  startSegment(segmentId: string): NarrativeNode | null;
  
  /**
   * 跳转到特定节点
   */
  jumpToNode(nodeId: string): NarrativeNode | null;
  
  /**
   * 推进剧情
   * @param choiceId 如果是分支选项，传入选项ID
   */
  advance(choiceId?: string): NarrativeNode | null;
  
  /**
   * 触发交互事件 (Phase 2 ECA)
   */
  triggerEvent(trigger: string, targetId?: string): Promise<void>;

  getCurrentNode(): NarrativeNode | null;
}
