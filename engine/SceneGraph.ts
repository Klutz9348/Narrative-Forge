
import { ISceneGraph } from './interfaces';
import { NarrativeNode } from '../types';

export class SceneGraph implements ISceneGraph {
  private _nodes: Map<string, NarrativeNode> = new Map();
  public rootId: string = "";

  constructor() {}

  getNode(id: string): NarrativeNode | undefined {
    return this._nodes.get(id);
  }

  addNode(node: NarrativeNode): void {
    this._nodes.set(node.id, node);
    // TODO: Handle parent-child relationship updates logic here
    console.log(`[Engine] Node added: ${node.id}`);
  }

  removeNode(id: string): void {
    this._nodes.delete(id);
    console.log(`[Engine] Node removed: ${id}`);
  }

  getChildren(parentId: string): NarrativeNode[] {
    // Naive implementation for MVP
    const children: NarrativeNode[] = [];
    this._nodes.forEach(node => {
      if (node.childrenIds.includes(parentId)) { // Note: logic might be inverted in types, checking parentId property
        children.push(node);
      }
    });
    return children;
  }

  loadSegment(nodes: Record<string, NarrativeNode>, rootId: string): void {
    this._nodes.clear();
    this.rootId = rootId;
    Object.values(nodes).forEach(node => {
      this._nodes.set(node.id, node);
    });
    console.log(`[Engine] Segment loaded. Node count: ${this._nodes.size}`);
  }
}
