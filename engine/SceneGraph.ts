
import { ISceneGraph } from './interfaces';
import { NarrativeNode } from '../types';

export class SceneGraph implements ISceneGraph {
  private _nodes: Map<string, NarrativeNode> = new Map();
  // Map<ParentID, ChildIDs[]>
  private _hierarchy: Map<string, string[]> = new Map();
  private _selectedNodeIds: Set<string> = new Set();
  
  public rootId: string = "";

  constructor() {}

  getNode(id: string): NarrativeNode | undefined {
    return this._nodes.get(id);
  }

  addNode(node: NarrativeNode): void {
    this._nodes.set(node.id, node);
    
    // Register in hierarchy
    if (node.parentId) {
      this.addToHierarchy(node.parentId, node.id);
    }

    console.log(`[SceneGraph] Node added: ${node.id}`);
  }

  removeNode(id: string): void {
    const node = this._nodes.get(id);
    if (!node) return;

    // Remove from hierarchy
    if (node.parentId) {
      this.removeFromHierarchy(node.parentId, id);
    }
    
    // Remove children references or delete children (implementation choice: currently simple removal)
    // A proper implementation might need to recursively remove children
    const children = this.getChildren(id);
    children.forEach(child => {
        child.parentId = undefined; // Detach children
    });
    this._hierarchy.delete(id);

    this._nodes.delete(id);
    this._selectedNodeIds.delete(id);
    console.log(`[SceneGraph] Node removed: ${id}`);
  }

  setParent(childId: string, parentId: string | undefined): void {
    const child = this._nodes.get(childId);
    if (!child) return;

    // Remove from old parent
    if (child.parentId) {
      this.removeFromHierarchy(child.parentId, childId);
    }

    child.parentId = parentId;

    // Add to new parent
    if (parentId) {
      this.addToHierarchy(parentId, childId);
    }
  }

  getParent(childId: string): NarrativeNode | undefined {
    const child = this._nodes.get(childId);
    if (child && child.parentId) {
      return this._nodes.get(child.parentId);
    }
    return undefined;
  }

  getChildren(parentId: string): NarrativeNode[] {
    const childrenIds = this._hierarchy.get(parentId) || [];
    const children: NarrativeNode[] = [];
    childrenIds.forEach(id => {
      const node = this._nodes.get(id);
      if (node) children.push(node);
    });
    return children;
  }

  selectNode(id: string, exclusive: boolean = true): void {
    if (exclusive) {
      this._selectedNodeIds.clear();
    }
    if (this._nodes.has(id)) {
      this._selectedNodeIds.add(id);
    }
  }

  getSelectedNodes(): NarrativeNode[] {
    const nodes: NarrativeNode[] = [];
    this._selectedNodeIds.forEach(id => {
      const node = this._nodes.get(id);
      if (node) nodes.push(node);
    });
    return nodes;
  }

  clearSelection(): void {
    this._selectedNodeIds.clear();
  }

  loadSegment(nodes: Record<string, NarrativeNode>, rootId: string): void {
    this._nodes.clear();
    this._hierarchy.clear();
    this._selectedNodeIds.clear();
    this.rootId = rootId;

    Object.values(nodes).forEach(node => {
      this.addNode(node);
    });
    console.log(`[SceneGraph] Segment loaded. Node count: ${this._nodes.size}`);
  }

  // --- Private Helpers ---

  private addToHierarchy(parentId: string, childId: string) {
    if (!this._hierarchy.has(parentId)) {
      this._hierarchy.set(parentId, []);
    }
    const children = this._hierarchy.get(parentId)!;
    if (!children.includes(childId)) {
      children.push(childId);
    }
  }

  private removeFromHierarchy(parentId: string, childId: string) {
    const children = this._hierarchy.get(parentId);
    if (children) {
      this._hierarchy.set(parentId, children.filter(id => id !== childId));
    }
  }
}
