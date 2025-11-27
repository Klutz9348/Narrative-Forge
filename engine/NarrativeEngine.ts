
import { INarrativeEngine, IVariableStore, IEventBus, ISceneGraph } from './interfaces';
import { VariableStore } from './VariableStore';
import { EventBus } from './EventBus';
import { SceneGraph } from './SceneGraph';
import { ActionExecutor } from './ActionExecutor';
import { StoryAsset, SegmentAsset, NarrativeNode, Edge, NodeType, DialogueNode, ActionNode, LocationNode } from '../types';

export class NarrativeEngine implements INarrativeEngine {
  public variableStore: IVariableStore;
  public eventBus: IEventBus;
  public sceneGraph: ISceneGraph;
  private actionExecutor: ActionExecutor;
  
  private _story: StoryAsset | null = null;
  private _currentSegment: SegmentAsset | null = null;
  private _currentNodeId: string | null = null;

  constructor() {
    this.eventBus = new EventBus();
    this.variableStore = new VariableStore();
    this.variableStore.setEventBus(this.eventBus);
    this.sceneGraph = new SceneGraph();
    this.actionExecutor = new ActionExecutor(this.variableStore, this.eventBus);
  }

  loadStory(story: StoryAsset): void {
    this._story = story;
    // Initialize RPG state
    this.variableStore.init(story);
    
    this.eventBus.emit('story:loaded', { storyId: story.id, title: story.title });
    console.log(`[NarrativeEngine] Story loaded: ${story.title}`);
  }

  startSegment(segmentId: string): NarrativeNode | null {
    if (!this._story) {
      console.error("[NarrativeEngine] No story loaded");
      return null;
    }

    const segment = this._story.segments.find(s => s.id === segmentId);
    if (!segment) {
      console.error(`[NarrativeEngine] Segment not found: ${segmentId}`);
      return null;
    }

    this._currentSegment = segment;
    this.sceneGraph.loadSegment(segment.nodes, segment.rootNodeId);
    
    this.eventBus.emit('segment:started', { segmentId: segment.id, name: segment.name });

    // 从 Root Node 开始，如果未定义 Root Node，则尝试找第一个
    let startNodeId = segment.rootNodeId;
    if (!startNodeId || !segment.nodes[startNodeId]) {
      const firstKey = Object.keys(segment.nodes)[0];
      startNodeId = firstKey;
    }

    if (startNodeId) {
        return this.setCurrentNode(startNodeId);
    }
    
    return null;
  }

  jumpToNode(nodeId: string): NarrativeNode | null {
    if (!this._currentSegment || !this._currentSegment.nodes[nodeId]) {
      console.error(`[NarrativeEngine] Cannot jump to node: ${nodeId}`);
      return null;
    }
    return this.setCurrentNode(nodeId);
  }

  advance(choiceId?: string): NarrativeNode | null {
    if (!this._currentSegment || !this._currentNodeId) return null;

    const currentNode = this._currentSegment.nodes[this._currentNodeId];
    if (!currentNode) return null;

    // 1. 查找所有从当前节点出发的边
    const outgoingEdges = this._currentSegment.edges.filter(
      edge => edge.sourceNodeId === this._currentNodeId
    );

    let targetEdge: Edge | undefined;

    // 2. 根据节点类型和输入决定走哪条路
    const isDialogue = currentNode.type === NodeType.DIALOGUE;
    const dialogueNode = isDialogue ? (currentNode as DialogueNode) : null;
    
    if (dialogueNode && dialogueNode.choices && dialogueNode.choices.length > 0) {
      // 如果是带选项的对话节点，必须匹配 choiceId (即 sourceHandleId)
      if (!choiceId) {
        console.warn("[NarrativeEngine] Dialogue node requires a choiceId to advance.");
        return currentNode; // 停留在当前节点
      }
      targetEdge = outgoingEdges.find(e => e.sourceHandleId === choiceId);
    } else {
      // 线性节点（Location, 无选项Dialogue, Jump等），通常只有一个默认输出
      const candidates = outgoingEdges.filter(e => !e.sourceHandleId);
      
      // 3. 检查条件
      for (const edge of candidates) {
        if (edge.condition) {
          if (this.variableStore.evaluateCondition(edge.condition)) {
            targetEdge = edge;
            break;
          }
        } else {
          // 无条件的边作为 fallback
          targetEdge = edge;
          break; // 找到第一个无条件边即停止（贪婪匹配）
        }
      }
    }

    if (targetEdge) {
      console.log(`[NarrativeEngine] Advanced to node: ${targetEdge.targetNodeId} via edge: ${targetEdge.id}`);
      return this.setCurrentNode(targetEdge.targetNodeId);
    } else {
      console.log("[NarrativeEngine] End of path reached.");
      this.eventBus.emit('story:end', { segmentId: this._currentSegment.id });
      return null;
    }
  }

  async triggerEvent(trigger: string, targetId?: string): Promise<void> {
      if (!this._currentNodeId || !this._currentSegment) return;
      const currentNode = this._currentSegment.nodes[this._currentNodeId];
      if (!currentNode) return;

      console.log(`[NarrativeEngine] Trigger: ${trigger} on ${currentNode.name}`);

      // Handle Standardized Events (for ALL nodes)
      // Filter by trigger type and optional targetId (e.g. for hotspots)
      const matchingEvents = (currentNode.events || []).filter(e => {
          if (e.trigger !== trigger) return false;
          if (targetId && e.targetId !== targetId) return false;
          return true;
      });

      for (const evt of matchingEvents) {
          if (evt.actions && evt.actions.length > 0) {
              await this.actionExecutor.executeGroup(evt.actions);
          }
      }
  }

  getCurrentNode(): NarrativeNode | null {
    if (!this._currentSegment || !this._currentNodeId) return null;
    return this._currentSegment.nodes[this._currentNodeId] || null;
  }

  // --- Private Helpers ---

  private setCurrentNode(nodeId: string): NarrativeNode | null {
     if (this._currentNodeId) {
         // Trigger exit event for previous node
         this.triggerEvent('onExit'); 
         this.eventBus.emit('node:exit', { nodeId: this._currentNodeId });
     }

     this._currentNodeId = nodeId;
     const node = this.getCurrentNode();

     if (node) {
         this.eventBus.emit('node:enter', { nodeId: node.id, type: node.type, node });
         // Sync SceneGraph selection
         this.sceneGraph.selectNode(node.id);

         // 1. Handle auto-trigger events (Lifecycle: onEnter)
         this.triggerEvent('onEnter');

         // 2. Handle ACTION Nodes (Auto-execute and advance)
         if (node.type === NodeType.ACTION) {
             const actionNode = node as ActionNode;
             if (actionNode.actions && actionNode.actions.length > 0) {
                 this.actionExecutor.executeGroup(actionNode.actions).then(() => {
                     // Auto-advance after actions complete
                     setTimeout(() => this.advance(), 100);
                 });
             } else {
                 setTimeout(() => this.advance(), 100);
             }
         }
     }

     return node;
  }
}
