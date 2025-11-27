
import { NarrativeNode, StoryAsset } from '../types';

/**
 * 场景图接口
 * 负责管理节点层级、查找与遍历
 */
export interface ISceneGraph {
  rootId: string;
  getNode(id: string): NarrativeNode | undefined;
  addNode(node: NarrativeNode): void;
  removeNode(id: string): void;
  getChildren(parentId: string): NarrativeNode[];
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
