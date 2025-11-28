
import { INarrativeEngine, IVariableStore, IEventBus, ISceneGraph } from './interfaces';
import { VariableStore } from './VariableStore';
import { EventBus } from './EventBus';
import { SceneGraph } from './SceneGraph';
import { ActionExecutor } from './ActionExecutor';
import { StoryAsset, SegmentAsset, NarrativeNode, Edge, NodeType, DialogueNode, ActionNode, BranchNode, LogicOperator } from '../types';
import { ConditionEngine } from './logic/ConditionEngine';
import { ActionExtension, ConditionExtension } from './logic/types';
import { actionRegistry, conditionRegistry } from './logic/registries';

export class NarrativeEngine implements INarrativeEngine {
  public variableStore: IVariableStore;
  public eventBus: IEventBus;
  public sceneGraph: ISceneGraph;
  private actionExecutor: ActionExecutor;
  private conditionEngine: ConditionEngine;
  
  private _story: StoryAsset | null = null;
  private _currentSegment: SegmentAsset | null = null;
  private _currentNodeId: string | null = null;
  private _currentSceneNodeId: string | null = null; // track last LOCATION node
  private edgePass(edge: Edge, sourceNode: NarrativeNode): boolean {
    if (edge.condition) {
      return typeof edge.condition === 'string'
        ? this.conditionEngine.evaluateLegacy(edge.condition)
        : this.conditionEngine.evaluate(edge.condition);
    }

    // Branch node with condition list
    if (sourceNode.type === NodeType.BRANCH && edge.sourceHandleId) {
      const branch = sourceNode as BranchNode;
      const cond = branch.conditions?.find(c => c.id === edge.sourceHandleId);
      if (cond) {
        return this.compare(this.variableStore.getAttribute(cond.variableId), cond.operator, cond.value);
      }
    }

    return true;
  }

  private compare(left: any, op: LogicOperator, right: any): boolean {
    switch (op) {
      case '==': return left == right; // eslint-disable-line eqeqeq
      case '!=': return left != right; // eslint-disable-line eqeqeq
      case '>': return Number(left) > Number(right);
      case '>=': return Number(left) >= Number(right);
      case '<': return Number(left) < Number(right);
      case '<=': return Number(left) <= Number(right);
      case 'contains': return String(left).includes(String(right));
      default: return false;
    }
  }

  private async resolveNavigationFromNode(nodeId: string): Promise<void> {
    const node = this._currentSegment?.nodes[nodeId];
    if (!node) {
      this.debugWarn(`导航目标不存在: ${nodeId}`);
      return;
    }

    // Action: 执行并继续沿出边导航
    if (node.type === NodeType.ACTION) {
      const actionNode = node as ActionNode;
      if (actionNode.actions?.length) {
        await this.actionExecutor.executeGroup(actionNode.actions);
      }
      const outgoing = this._currentSegment?.edges.filter(e => e.sourceNodeId === node.id) || [];
      for (const edge of outgoing) {
        const target = this._currentSegment?.nodes[edge.targetNodeId];
        if (!target) continue;
        if (this.edgePass(edge, node)) {
          await this.resolveNavigationFromNode(edge.targetNodeId);
          return;
        }
      }
      return;
    }

    // Branch: 选择首个命中的出边跳转
    if (node.type === NodeType.BRANCH) {
      const outgoing = this._currentSegment?.edges.filter(e => e.sourceNodeId === node.id) || [];
      for (const edge of outgoing) {
        if (this.edgePass(edge, node)) {
          await this.resolveNavigationFromNode(edge.targetNodeId);
          return;
        }
      }
      this.debugWarn(`分支无可行出边: ${node.id}`);
      return;
    }

    // Sequence: 顺序执行出边，命中导航即跳转并停止
    if (node.type === NodeType.SEQUENCE) {
      const outgoing = this._currentSegment?.edges.filter(e => e.sourceNodeId === node.id) || [];
      for (const edge of outgoing) {
        const target = this._currentSegment?.nodes[edge.targetNodeId];
        if (!target) continue;
        if (!this.edgePass(edge, node)) continue;
        if (target.type === NodeType.ACTION) {
          await this.resolveNavigationFromNode(edge.targetNodeId);
        } else {
          await this.resolveNavigationFromNode(edge.targetNodeId);
          return;
        }
      }
      return;
    }

    // 其它（Location/Dialogue/Vote/Jump等）直接跳转
    this.setCurrentNode(node.id);
  }
  private debugWarn(message: string, data?: any) {
    console.warn(`[NarrativeEngine][Debug] ${message}`, data || '');
    this.eventBus.emit('ui:toast', { message: message });
  }

  constructor() {
    this.eventBus = new EventBus();
    this.variableStore = new VariableStore();
    this.variableStore.setEventBus(this.eventBus);
    this.sceneGraph = new SceneGraph();
    this.actionExecutor = new ActionExecutor(this.variableStore, this.eventBus, actionRegistry);
    this.conditionEngine = new ConditionEngine(conditionRegistry, this.variableStore, this.eventBus);

    // Allow actions to request an engine advance (e.g., close dialogue)
    this.eventBus.on('engine:advance', () => this.advance());
    this.eventBus.on('engine:jumpTo', ({ targetNodeId }) => {
      if (targetNodeId) this.jumpToNode(targetNodeId);
    });
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
      // 线性节点（Location, Branch, Action等）
      const candidates = outgoingEdges.filter(e => !e.sourceHandleId || currentNode.type === NodeType.BRANCH);
      
      // 3. 检查条件
      for (const edge of candidates) {
        if (this.edgePass(edge, currentNode)) {
          targetEdge = edge;
          break;
        }
      }
    }

    if (targetEdge) {
      console.log(`[NarrativeEngine] Advanced to node: ${targetEdge.targetNodeId} via edge: ${targetEdge.id}`);
      return this.setCurrentNode(targetEdge.targetNodeId);
    } else {
      this.debugWarn(`当前节点无可行连线，流程停止: ${currentNode.name}`, { nodeId: currentNode.id });
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
          const shouldRun = evt.condition
            ? (typeof evt.condition === 'string'
                ? this.conditionEngine.evaluateLegacy(evt.condition)
                : this.conditionEngine.evaluate(evt.condition))
            : true;

          if (!shouldRun) continue;

          // 并联：动作边全部执行，导航边取首个命中的跳转
          const outgoingEdges = this._currentSegment.edges.filter(
            (edge) => edge.sourceNodeId === currentNode.id && edge.sourceHandleId === evt.id
          );

          const actionEdges: Edge[] = [];
          const navEdges: Edge[] = [];
          for (const edge of outgoingEdges) {
            const targetNode = this._currentSegment.nodes[edge.targetNodeId];
            if (!targetNode) continue;
            if (targetNode.type === NodeType.ACTION) {
              actionEdges.push(edge);
            } else {
              navEdges.push(edge);
            }
          }

          // 执行动作边
          for (const edge of actionEdges) {
            const targetNode = this._currentSegment.nodes[edge.targetNodeId] as ActionNode;
            if (!this.edgePass(edge, currentNode)) continue;
            if (targetNode.actions?.length) {
              await this.actionExecutor.executeGroup(targetNode.actions);
            }
            await this.resolveNavigationFromNode(edge.targetNodeId);
          }

          // 导航边：取首个命中的
          let matchedNav: Edge | undefined;
          for (const edge of navEdges) {
            if (this.edgePass(edge, currentNode)) {
              matchedNav = edge;
              break;
            }
          }

          if (matchedNav) {
            await this.resolveNavigationFromNode(matchedNav.targetNodeId);
          } else if (actionEdges.length === 0) {
            this.debugWarn(`事件没有找到匹配的连线: ${evt.label}`, { event: evt.id });
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
        if (node.type === NodeType.LOCATION) {
            this._currentSceneNodeId = node.id;
        }
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
                    const hasOutgoing = this._currentSegment?.edges.some(e => e.sourceNodeId === node.id);
                    if (hasOutgoing) {
                        // Auto-advance only if有后续连线
                        setTimeout(() => this.advance(), 100);
                    } else {
                        // 无后续连线：保持场景，清空前景节点但回退到上一次 Location 以便事件继续触发
                        this._currentNodeId = this._currentSceneNodeId;
                        this.eventBus.emit('node:exit', { nodeId: node.id });
                    }
                });
            } else {
                const hasOutgoing = this._currentSegment?.edges.some(e => e.sourceNodeId === node.id);
                if (hasOutgoing) {
                    setTimeout(() => this.advance(), 100);
                } else {
                    this._currentNodeId = this._currentSceneNodeId;
                    this.eventBus.emit('node:exit', { nodeId: node.id });
                }
            }
        } else if (node.type === NodeType.START) {
            // Auto-step past the synthetic START node so runtime shows the first real scene
            setTimeout(() => this.advance(), 0);
        } else if (node.type === NodeType.BRANCH) {
            // Branch nodes应立即评估，避免停留并吞掉点击
            setTimeout(() => this.advance(), 0);
        }
    }

     return node;
  }

  // --- Extension Points ---

  registerAction(extension: ActionExtension) {
    this.actionExecutor.register(extension);
  }

  registerCondition(extension: ConditionExtension) {
    this.conditionEngine.register(extension);
  }
}
