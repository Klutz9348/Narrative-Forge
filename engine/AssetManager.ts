
import { NarrativeNode, NodeType, StoryAsset, SegmentAsset, Edge, Vector2 } from '../types';

export class AssetManager {
  static generateId(prefix: string = 'id'): string {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createStory(): StoryAsset {
    const firstSegment = AssetManager.createSegment('Chapter 1');
    
    return {
      id: AssetManager.generateId('story'),
      title: 'New Story',
      description: '',
      activeSegmentId: firstSegment.id,
      characters: [],
      segments: [firstSegment],
      globalVariables: [],
      items: [],
      clues: []
    };
  }

  static createSegment(name: string = 'New Segment'): SegmentAsset {
    const segmentId = AssetManager.generateId('seg');
    const startNode = AssetManager.createNode(NodeType.START, { x: 100, y: 300 });
    
    return {
      id: segmentId,
      name,
      rootNodeId: startNode.id,
      nodes: {
        [startNode.id]: startNode
      },
      edges: []
    };
  }

  static createNode(type: NodeType, position: Vector2): NarrativeNode {
    const id = AssetManager.generateId('node');
    const base = {
      id,
      type,
      name: 'Node', // Default name, overridden below
      position,
      size: { x: 300, y: 200 },
      parentId: undefined
    };

    switch (type) {
      case NodeType.START:
        return { ...base, name: 'Start', size: { x: 120, y: 60 } } as any;
      case NodeType.DIALOGUE:
        return { ...base, name: 'Dialogue', characterId: '', text: '...', choices: [] } as any;
      case NodeType.LOCATION:
        return { ...base, name: 'Location', backgroundImage: '', hotspots: [] } as any;
      case NodeType.BRANCH:
        return { ...base, name: 'Logic Branch', conditions: [] } as any;
      case NodeType.SET_VARIABLE:
        return { ...base, name: 'Set Variable', variableName: 'new_var', operator: 'SET', value: '0', size: { x: 250, y: 150 } } as any;
      case NodeType.JUMP:
        return { ...base, name: 'Jump to...', targetSegmentId: '', size: { x: 250, y: 120 } } as any;
      case NodeType.ACTION:
        return { ...base, name: 'Action Sequence', commands: [], size: { x: 250, y: 200 } } as any;
      default:
        return base as NarrativeNode;
    }
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