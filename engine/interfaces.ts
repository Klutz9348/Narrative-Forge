
import { NarrativeNode, StoryAsset } from '../types';

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
 * 管理游戏运行时的状态变量
 */
export interface IVariableStore {
  setEventBus(eventBus: IEventBus): void;
  set(key: string, value: any): void;
  get(key: string): any;
  getAll(): Record<string, any>;
  /**
   * 评估条件表达式
   * @param condition 表达式字符串，例如 "sanity > 50 && hasKey == true"
   */
  evaluateCondition(condition: string): boolean;
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
  
  getCurrentNode(): NarrativeNode | null;
}
