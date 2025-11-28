
import { ICommand } from '../interfaces';
import { NarrativeNode, Edge, StoryAsset, NodeType } from '../../types';

// Helper type for Zustand setState
type StateSetter = (fn: (state: any) => any) => void;

// Batch command to group multiple operations into a single undo/redo entry
export class MultiCommand implements ICommand {
  id = Math.random().toString(36);
  constructor(public name: string, private commands: ICommand[]) {}

  execute() {
    this.commands.forEach(c => c.execute());
  }

  undo() {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

export class BatchUpdateNodesCommand implements ICommand {
  id = Math.random().toString(36);
  name = "Batch Update Nodes";

  constructor(
    private updates: { id: string; oldData: Partial<NarrativeNode>; newData: Partial<NarrativeNode> }[],
    private segmentId: string,
    private setState: StateSetter
  ) {}

  execute() {
    this.apply(this.updates.map(u => ({ id: u.id, data: u.newData })));
  }

  undo() {
    this.apply(this.updates.map(u => ({ id: u.id, data: u.oldData })));
  }

  private apply(changes: { id: string; data: Partial<NarrativeNode> }[]) {
    this.setState((state: any) => {
      const story = state.story as StoryAsset;
      const segIdx = story.segments.findIndex((s: any) => s.id === this.segmentId);
      if (segIdx === -1) return state;
      const segment = story.segments[segIdx];

      const newNodes = { ...segment.nodes };
      changes.forEach(change => {
        const node = newNodes[change.id];
        if (node) {
          newNodes[change.id] = { ...node, ...change.data };
        }
      });

      const newSegments = [...story.segments];
      newSegments[segIdx] = { ...segment, nodes: newNodes };
      return { story: { ...story, segments: newSegments } };
    });
  }
}

export class BatchDeleteEntitiesCommand implements ICommand {
  id = Math.random().toString(36);
  name = "Batch Delete Entities";

  private removedNodes: NarrativeNode[] = [];
  private removedEdges: Edge[] = [];

  constructor(
    private segmentId: string,
    private nodes: NarrativeNode[],
    private edges: Edge[],
    private setState: StateSetter
  ) {}

  execute() {
    this.setState((state: any) => {
      const story = state.story as StoryAsset;
      const segIdx = story.segments.findIndex((s: any) => s.id === this.segmentId);
      if (segIdx === -1) return state;

      const segment = story.segments[segIdx];
      const nodeIdSet = new Set(this.nodes.map(n => n.id));
      const edgeIdSet = new Set(this.edges.map(e => e.id));

      // Edges connected to removed nodes should also be removed
      const edgesToRemove: Edge[] = [];
      segment.edges.forEach(e => {
        if (nodeIdSet.has(e.sourceNodeId) || nodeIdSet.has(e.targetNodeId) || edgeIdSet.has(e.id)) {
          edgesToRemove.push(e);
        }
      });

      this.removedNodes = this.nodes;
      this.removedEdges = edgesToRemove;

      const newNodes = { ...segment.nodes };
      this.removedNodes.forEach(n => delete newNodes[n.id]);

      const newEdges = segment.edges.filter(e => !edgesToRemove.find(r => r.id === e.id));

      const newSegments = [...story.segments];
      newSegments[segIdx] = { ...segment, nodes: newNodes, edges: newEdges };

      return { story: { ...story, segments: newSegments }, selectedIds: [] };
    });
  }

  undo() {
    this.setState((state: any) => {
      const story = state.story as StoryAsset;
      const segIdx = story.segments.findIndex((s: any) => s.id === this.segmentId);
      if (segIdx === -1) return state;

      const segment = story.segments[segIdx];

      const restoredNodes = { ...segment.nodes };
      this.removedNodes.forEach(n => { restoredNodes[n.id] = n; });

      const currentEdgeIds = new Set(segment.edges.map((e: Edge) => e.id));
      const restoredEdges = [...segment.edges];
      this.removedEdges.forEach(e => {
        if (!currentEdgeIds.has(e.id)) {
          restoredEdges.push(e);
        }
      });

      const newSegments = [...story.segments];
      newSegments[segIdx] = { ...segment, nodes: restoredNodes, edges: restoredEdges };

      return { story: { ...story, segments: newSegments } };
    });
  }
}

// --- Node Commands ---

export class AddNodeCommand implements ICommand {
  id = Math.random().toString(36);
  name = "Add Node";

  constructor(
    private node: NarrativeNode,
    private segmentId: string,
    private setState: StateSetter
  ) {}

  execute() {
    this.setState((state: any) => {
      const story = state.story as StoryAsset;
      const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
      if (segmentIndex === -1) return state;

      const newSegments = [...story.segments];
      newSegments[segmentIndex] = {
        ...newSegments[segmentIndex],
        nodes: { ...newSegments[segmentIndex].nodes, [this.node.id]: this.node }
      };

      return { story: { ...story, segments: newSegments } };
    });
  }

  undo() {
    this.setState((state: any) => {
      const story = state.story as StoryAsset;
      const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
      if (segmentIndex === -1) return state;

      const newSegments = [...story.segments];
      const newNodes = { ...newSegments[segmentIndex].nodes };
      delete newNodes[this.node.id];
      
      newSegments[segmentIndex] = { ...newSegments[segmentIndex], nodes: newNodes };
      return { story: { ...story, segments: newSegments } };
    });
  }
}

export class RemoveNodeCommand implements ICommand {
  id = Math.random().toString(36);
  name = "Remove Node";
  private removedEdges: Edge[] = [];

  constructor(
    private nodeId: string,
    private nodeData: NarrativeNode,
    private segmentId: string,
    private setState: StateSetter
  ) {}

  execute() {
    this.setState((state: any) => {
      const story = state.story as StoryAsset;
      const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
      if (segmentIndex === -1) return state;

      const segment = story.segments[segmentIndex];
      
      // Find connected edges
      const connectedEdges = segment.edges.filter(
        e => e.sourceNodeId === this.nodeId || e.targetNodeId === this.nodeId
      );
      this.removedEdges = connectedEdges;

      const newEdges = segment.edges.filter(e => !connectedEdges.includes(e));
      const newNodes = { ...segment.nodes };
      delete newNodes[this.nodeId];
      
      const newSegments = [...story.segments];
      newSegments[segmentIndex] = { ...segment, nodes: newNodes, edges: newEdges };
      return { story: { ...story, segments: newSegments }, selectedIds: [] };
    });
  }

  undo() {
    this.setState((state: any) => {
      const story = state.story as StoryAsset;
      const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
      if (segmentIndex === -1) return state;

      const segment = story.segments[segmentIndex];
      const newSegments = [...story.segments];
      
      // Restore node
      const newNodes = { ...segment.nodes, [this.nodeId]: this.nodeData };
      
      // Restore edges
      // We check existence to avoid duplication, though unlikely with proper undo flow
      const currentEdgeIds = new Set(segment.edges.map(e => e.id));
      const edgesToRestore = this.removedEdges.filter(e => !currentEdgeIds.has(e.id));
      const newEdges = [...segment.edges, ...edgesToRestore];

      newSegments[segmentIndex] = {
        ...segment,
        nodes: newNodes,
        edges: newEdges
      };

      return { story: { ...story, segments: newSegments } };
    });
  }
}

export class UpdateNodeCommand implements ICommand {
  id = Math.random().toString(36);
  name = "Update Node";

  constructor(
    private nodeId: string,
    private oldData: Partial<NarrativeNode>,
    private newData: Partial<NarrativeNode>,
    private segmentId: string,
    private setState: StateSetter
  ) {}

  execute() {
    this.setState((state: any) => {
      return this.applyUpdate(state, this.newData);
    });
  }

  undo() {
    this.setState((state: any) => {
      return this.applyUpdate(state, this.oldData);
    });
  }

  private applyUpdate(state: any, data: Partial<NarrativeNode>) {
      const story = state.story as StoryAsset;
      const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
      if (segmentIndex === -1) return state;

      const segment = story.segments[segmentIndex];
      const node = segment.nodes[this.nodeId];
      if (!node) return state;

      const newSegments = [...story.segments];
      newSegments[segmentIndex] = {
        ...segment,
        nodes: {
          ...segment.nodes,
          [this.nodeId]: { ...node, ...data }
        }
      };
      
      return { story: { ...story, segments: newSegments } };
  }
}

// --- Edge Commands ---

export class AddEdgeCommand implements ICommand {
    id = Math.random().toString(36);
    name = "Add Edge";
    
    constructor(
        private edge: Edge,
        private segmentId: string,
        private setState: StateSetter
    ) {}

    execute() {
        this.setState((state: any) => {
            const story = state.story as StoryAsset;
            const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
            if(segmentIndex === -1) return state;
            
            const newSegments = [...story.segments];
            newSegments[segmentIndex] = {
                ...newSegments[segmentIndex],
                edges: [...newSegments[segmentIndex].edges, this.edge]
            };
            return { story: { ...story, segments: newSegments } };
        });
    }

    undo() {
        this.setState((state: any) => {
            const story = state.story as StoryAsset;
            const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
            if(segmentIndex === -1) return state;

            const newSegments = [...story.segments];
            newSegments[segmentIndex] = {
                ...newSegments[segmentIndex],
                edges: newSegments[segmentIndex].edges.filter(e => e.id !== this.edge.id)
            };
            return { story: { ...story, segments: newSegments } };
        });
    }
}

export class RemoveEdgeCommand implements ICommand {
    id = Math.random().toString(36);
    name = "Remove Edge";

    constructor(
        private edgeId: string,
        private edgeData: Edge,
        private segmentId: string,
        private setState: StateSetter
    ) {}

    execute() {
        this.setState((state: any) => {
            const story = state.story as StoryAsset;
            const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
            if(segmentIndex === -1) return state;

            const newSegments = [...story.segments];
            newSegments[segmentIndex] = {
                ...newSegments[segmentIndex],
                edges: newSegments[segmentIndex].edges.filter(e => e.id !== this.edgeId)
            };
            return { story: { ...story, segments: newSegments }, selectedIds: [] };
        });
    }

    undo() {
        this.setState((state: any) => {
            const story = state.story as StoryAsset;
            const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
            if(segmentIndex === -1) return state;
            
            const newSegments = [...story.segments];
            newSegments[segmentIndex] = {
                ...newSegments[segmentIndex],
                edges: [...newSegments[segmentIndex].edges, this.edgeData]
            };
            return { story: { ...story, segments: newSegments } };
        });
    }
}
