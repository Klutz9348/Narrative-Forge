
import { ICommand } from '../interfaces';
import { NarrativeNode, Edge, StoryAsset, NodeType } from '../../types';

// Helper type for Zustand setState
type StateSetter = (fn: (state: any) => any) => void;

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

      const newSegments = [...story.segments];
      const newNodes = { ...newSegments[segmentIndex].nodes };
      delete newNodes[this.nodeId];
      
      newSegments[segmentIndex] = { ...newSegments[segmentIndex], nodes: newNodes };
      return { story: { ...story, segments: newSegments }, selectedIds: [] };
    });
  }

  undo() {
    this.setState((state: any) => {
      const story = state.story as StoryAsset;
      const segmentIndex = story.segments.findIndex(s => s.id === this.segmentId);
      if (segmentIndex === -1) return state;

      const newSegments = [...story.segments];
      newSegments[segmentIndex] = {
        ...newSegments[segmentIndex],
        nodes: { ...newSegments[segmentIndex].nodes, [this.nodeId]: this.nodeData }
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
                edges: [...newSegments[segmentIndex].edges, this.edgeData]
            };
            return { story: { ...story, segments: newSegments } };
        });
    }
}
