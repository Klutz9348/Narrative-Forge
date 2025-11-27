
import { NarrativeNode, NodeType, StoryAsset, SegmentAsset, Edge, Vector2 } from '../types';

export class AssetManager {
  static generateId(prefix: string = 'id'): string {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createStory(): StoryAsset {
    return {
      id: AssetManager.generateId('story'),
      title: 'New Story',
      description: '',
      activeSegmentId: '',
      characters: [],
      segments: []
    };
  }

  static createSegment(name: string = 'New Segment'): SegmentAsset {
    return {
      id: AssetManager.generateId('seg'),
      name,
      rootNodeId: '',
      nodes: {},
      edges: []
    };
  }

  static createNode(type: NodeType, position: Vector2): NarrativeNode {
    const id = AssetManager.generateId('node');
    const base = {
      id,
      type,
      name: type === NodeType.DIALOGUE ? 'Dialogue' : 'Node',
      position,
      size: { x: 300, y: 200 },
      parentId: undefined
    };

    if (type === NodeType.DIALOGUE) {
      return { ...base, characterId: '', text: '...', choices: [] } as any;
    } else if (type === NodeType.LOCATION) {
        return { ...base, backgroundImage: '', hotspots: [] } as any;
    }
    return base as NarrativeNode;
  }
  
  static createEdge(sourceId: string, targetId: string, sourceHandle?: string): Edge {
      return {
          id: AssetManager.generateId('edge'),
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          sourceHandleId: sourceHandle
      };
  }
}
