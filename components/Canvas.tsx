
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MousePointer2, Type, Image as ImageIcon, ZoomIn, ZoomOut, GitGraph, Variable, ArrowRightCircle, ChevronDown, Layers, Zap, Clapperboard, Timer, Smartphone, MessageSquare, Play } from 'lucide-react';
import { NodeType, NarrativeNode, Vector2, DialogueNode, BranchNode, VariableSetterNode, JumpNode, LocationNode, ActionNode, Hotspot } from '../types';
import { useEditorStore } from '../store/useEditorStore';

// Bezier Curve Helper
const getBezierPath = (
  start: Vector2,
  end: Vector2,
  controlOffset: number = 50
) => {
  return `M${start.x},${start.y} C${start.x + controlOffset},${start.y} ${end.x - controlOffset},${end.y} ${end.x},${end.y}`;
};

// Layout Constants
const LAYOUT = {
  BORDER: 1,
  HEADER_HEIGHT: 24,
  PADDING: 12,
  ITEM_HEIGHT: 24,
  ITEM_GAP: 4,
  BRANCH_GAP: 8
};

interface NodeComponentProps {
  node: NarrativeNode;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent, node: NarrativeNode) => void;
  onMouseUp: (e: React.MouseEvent, nodeId: string) => void;
  onHandleMouseDown: (e: React.MouseEvent, nodeId: string, handleId?: string) => void;
  renderContent: (node: NarrativeNode) => React.ReactNode;
  getNodeColorClass: (type: NodeType) => string;
  getNodeIcon: (type: NodeType) => React.ReactNode;
}

const NodeComponent: React.FC<NodeComponentProps> = React.memo(({ 
    node, selected, onMouseDown, onMouseUp, onHandleMouseDown, renderContent, getNodeColorClass, getNodeIcon 
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const { updateNode } = useEditorStore();
    
    // Auto-resize Logic: Sync DOM height to Store
    useEffect(() => {
        if(!elementRef.current) return;
        
        const observer = new ResizeObserver(() => {
            // Wrap in requestAnimationFrame to avoid "ResizeObserver loop completed with undelivered notifications"
            // This error occurs when the observation callback triggers a change that is observed in the same frame.
            window.requestAnimationFrame(() => {
                const el = elementRef.current;
                if (el) {
                    // Use offsetHeight to include padding/border which matches visual height
                    const h = el.offsetHeight;
                    // Only update if difference is significant to avoid rounding jitter
                    if (Math.abs(h - node.size.y) > 1) {
                        // Update store (this will trigger re-render of edges)
                        updateNode(node.id, { size: { ...node.size, y: h } });
                    }
                }
            });
        });
        observer.observe(elementRef.current);
        return () => observer.disconnect();
    }, [node.id, node.size.y, updateNode]);

    const isDialogue = node.type === NodeType.DIALOGUE;
    const isBranch = node.type === NodeType.BRANCH;
    const isLocation = node.type === NodeType.LOCATION;
    const isStart = node.type === NodeType.START;

    const hasChoices = isDialogue && (node as DialogueNode).choices && (node as DialogueNode).choices.length > 0;
    const showDefaultHandle = !isBranch && !isLocation && !hasChoices;
    const showInputHandle = !isStart; // Start node has no input

    return (
        <div
            ref={elementRef}
            onMouseDown={(e) => onMouseDown(e, node)}
            onMouseUp={(e) => onMouseUp(e, node.id)}
            className={`absolute border transition-shadow duration-150 group flex flex-col pointer-events-auto
              ${selected ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-xl' : 'border-zinc-700 hover:border-zinc-500'}
              bg-zinc-800 rounded-md
            `}
            style={{
              left: node.position.x,
              top: node.position.y,
              width: node.size.x,
              // height is AUTO to allow growth
              cursor: 'grab'
            }}
        >
             {/* Input Handle */}
            {showInputHandle && (
              <div 
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-600 border border-zinc-900 rounded-full hover:bg-indigo-500 z-20 cursor-crosshair transition-transform hover:scale-125" 
                  onMouseUp={(e) => onMouseUp(e, node.id)}
              />
            )}

            {/* Output Handle */}
            {showDefaultHandle && (
              <div 
                className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-600 border border-zinc-900 rounded-full hover:bg-indigo-500 z-20 cursor-crosshair transition-transform hover:scale-125" 
                onMouseDown={(e) => onHandleMouseDown(e, node.id)}
              />
            )}

            {/* Header */}
            <div className={`h-[24px] px-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider shrink-0 ${getNodeColorClass(node.type)}`}>
              {getNodeIcon(node.type)}
              <span className="truncate flex-1">{node.name}</span>
            </div>

            {/* Content */}
            <div className="p-[12px] text-zinc-300 text-xs flex-1 relative flex flex-col">
               {renderContent(node)}
            </div>
        </div>
    )
});

const Canvas: React.FC = () => {
  const { 
    story, 
    selectedIds, 
    canvasTransform, 
    selectNode, 
    clearSelection,
    updateNode,
    addNode,
    addEdge,
    deleteSelection,
    startEditing,
    commitEditing,
    setCanvasTransform
  } = useEditorStore();

  const activeSegment = story.segments.find(s => s.id === story.activeSegmentId);
  const nodes = activeSegment ? (Object.values(activeSegment.nodes) as NarrativeNode[]) : [];
  const edges = activeSegment ? activeSegment.edges : [];

  // Local State
  const [isPanning, setIsPanning] = useState(false);
  const [dragState, setDragState] = useState<{ nodeId: string, startX: number, startY: number, initialPos: Vector2 } | null>(null);
  
  // Hotspot Drag & Resize State
  const [hotspotDragState, setHotspotDragState] = useState<{
    nodeId: string;
    hotspotId: string;
    startX: number;
    startY: number;
    initialRect: { x: number; y: number; w: number; h: number };
    nodeSize: { x: number; y: number };
  } | null>(null);

  const [hotspotResizeState, setHotspotResizeState] = useState<{
    nodeId: string;
    hotspotId: string;
    handle: 'nw' | 'ne' | 'sw' | 'se';
    startX: number;
    startY: number;
    initialRect: { x: number; y: number; w: number; h: number };
    nodeSize: { x: number; y: number };
  } | null>(null);

  const [linkingState, setLinkingState] = useState<{
    sourceNodeId: string;
    sourceHandleId?: string;
    startPos: Vector2;
    mousePos: Vector2;
  } | null>(null);
  
  // HUD State
  const [showLogicMenu, setShowLogicMenu] = useState(false);

  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- CRITICAL: State Ref for Global Listeners ---
  const stateRef = useRef({
    canvasTransform,
    dragState,
    hotspotDragState,
    hotspotResizeState,
    linkingState,
    isPanning,
    panStart,
    story
  });

  useEffect(() => {
    stateRef.current = { 
      canvasTransform, 
      dragState, 
      hotspotDragState, 
      hotspotResizeState,
      linkingState, 
      isPanning, 
      panStart,
      story 
    };
  }, [canvasTransform, dragState, hotspotDragState, hotspotResizeState, linkingState, isPanning, panStart, story]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        deleteSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection]);

  // --- Global Window Event Listeners ---
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const current = stateRef.current;
      
      if (e.buttons === 0 && (current.dragState || current.isPanning || current.hotspotDragState || current.hotspotResizeState)) {
         handleWindowMouseUp(e);
         return;
      }

      if (current.isPanning) {
        const dx = e.clientX - current.panStart.x;
        const dy = e.clientY - current.panStart.y;
        setCanvasTransform({ 
          ...current.canvasTransform, 
          x: current.canvasTransform.x + dx, 
          y: current.canvasTransform.y + dy 
        });
        setPanStart({ x: e.clientX, y: e.clientY });
        stateRef.current.panStart = { x: e.clientX, y: e.clientY };
      } 
      else if (current.dragState) {
        const dx = (e.clientX - current.dragState.startX) / current.canvasTransform.scale;
        const dy = (e.clientY - current.dragState.startY) / current.canvasTransform.scale;
        
        updateNode(current.dragState.nodeId, {
          position: {
            x: Math.round(current.dragState.initialPos.x + dx),
            y: Math.round(current.dragState.initialPos.y + dy)
          }
        });
      }
      else if (current.hotspotDragState) {
        const dx = (e.clientX - current.hotspotDragState.startX) / current.canvasTransform.scale;
        const dy = (e.clientY - current.hotspotDragState.startY) / current.canvasTransform.scale;

        const dxPercent = (dx / current.hotspotDragState.nodeSize.x) * 100;
        const dyPercent = (dy / current.hotspotDragState.nodeSize.y) * 100;

        const newX = Math.min(Math.max(0, current.hotspotDragState.initialRect.x + dxPercent), 100 - current.hotspotDragState.initialRect.w);
        const newY = Math.min(Math.max(0, current.hotspotDragState.initialRect.y + dyPercent), 100 - current.hotspotDragState.initialRect.h);

        const activeSegment = current.story?.segments.find(s => s.id === current.story.activeSegmentId);
        const node = activeSegment?.nodes[current.hotspotDragState.nodeId];
        
        if (node && node.type === NodeType.LOCATION) {
           const locNode = node as LocationNode;
           const newHotspots = locNode.hotspots.map(hs => 
             hs.id === current.hotspotDragState!.hotspotId 
             ? { ...hs, rect: { ...hs.rect, x: newX, y: newY } }
             : hs
           );
           updateNode(node.id, { hotspots: newHotspots });
        }
      }
      else if (current.hotspotResizeState) {
        const { startX, startY, initialRect, nodeSize, handle, nodeId, hotspotId } = current.hotspotResizeState;
        
        const dx = (e.clientX - startX) / current.canvasTransform.scale;
        const dy = (e.clientY - startY) / current.canvasTransform.scale;
        
        const dxPercent = (dx / nodeSize.x) * 100;
        const dyPercent = (dy / nodeSize.y) * 100;

        let { x, y, w, h } = initialRect;

        if (handle.includes('e')) {
            w = Math.max(5, initialRect.w + dxPercent);
        }
        if (handle.includes('w')) {
            const maxDelta = initialRect.w - 5;
            const safeDx = Math.min(dxPercent, maxDelta);
            x = initialRect.x + safeDx;
            w = initialRect.w - safeDx;
        }
        if (handle.includes('s')) {
            h = Math.max(5, initialRect.h + dyPercent);
        }
        if (handle.includes('n')) {
            const maxDelta = initialRect.h - 5;
            const safeDy = Math.min(dyPercent, maxDelta);
            y = initialRect.y + safeDy;
            h = initialRect.h - safeDy;
        }

        if (x < 0) { w += x; x = 0; }
        if (y < 0) { h += y; y = 0; }
        if (x + w > 100) { w = 100 - x; }
        if (y + h > 100) { h = 100 - y; }

        const activeSegment = current.story?.segments.find(s => s.id === current.story.activeSegmentId);
        const node = activeSegment?.nodes[nodeId];
        
        if (node && node.type === NodeType.LOCATION) {
           const locNode = node as LocationNode;
           const newHotspots = locNode.hotspots.map(hs => 
             hs.id === hotspotId 
             ? { ...hs, rect: { x, y, w, h } }
             : hs
           );
           updateNode(node.id, { hotspots: newHotspots });
        }
      }
      else if (current.linkingState) {
        const rect = containerRef.current?.getBoundingClientRect();
        const offsetX = rect ? rect.left : 0;
        const offsetY = rect ? rect.top : 0;

        const pos = {
          x: (e.clientX - offsetX - current.canvasTransform.x) / current.canvasTransform.scale,
          y: (e.clientY - offsetY - current.canvasTransform.y) / current.canvasTransform.scale
        };
        
        setLinkingState({ ...current.linkingState, mousePos: pos });
        stateRef.current.linkingState = { ...current.linkingState, mousePos: pos };
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      const current = stateRef.current;

      if (current.dragState) {
        commitEditing(); 
        setDragState(null);
        stateRef.current.dragState = null;
      }
      
      if (current.hotspotDragState) {
        commitEditing();
        setHotspotDragState(null);
        stateRef.current.hotspotDragState = null;
      }

      if (current.hotspotResizeState) {
        commitEditing();
        setHotspotResizeState(null);
        stateRef.current.hotspotResizeState = null;
      }
      
      if (current.isPanning) {
        setIsPanning(false);
        stateRef.current.isPanning = false;
      }

      if (current.linkingState) {
         setLinkingState(null);
         stateRef.current.linkingState = null;
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

  // --- Interaction Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newScale = Math.min(Math.max(0.1, canvasTransform.scale - e.deltaY * zoomSensitivity), 5);
      setCanvasTransform({ ...canvasTransform, scale: newScale });
    } else {
      setCanvasTransform({ 
        ...canvasTransform, 
        x: canvasTransform.x - e.deltaX, 
        y: canvasTransform.y - e.deltaY 
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      stateRef.current.isPanning = true;
      stateRef.current.panStart = { x: e.clientX, y: e.clientY };
    } else {
        clearSelection();
    }
    setShowLogicMenu(false);
  };

  const getCanvasMousePos = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect ? rect.left : 0;
    const offsetY = rect ? rect.top : 0;
    return {
        x: (clientX - offsetX - canvasTransform.x) / canvasTransform.scale,
        y: (clientY - offsetY - canvasTransform.y) / canvasTransform.scale
    };
  };

  // --- Node Interactions ---

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: NarrativeNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    
    selectNode(node.id, e.shiftKey);
    startEditing(node.id); 
    
    const newDragState = {
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      initialPos: { ...node.position }
    };

    setDragState(newDragState);
    stateRef.current.dragState = newDragState;
    setShowLogicMenu(false);
  }, [selectNode, startEditing]);

  const handleHotspotMouseDown = (e: React.MouseEvent, nodeId: string, hotspot: Hotspot, nodeSize: Vector2) => {
    e.stopPropagation(); 
    e.preventDefault(); 
    if (e.button !== 0) return;

    selectNode(nodeId, false);
    startEditing(nodeId);

    const newHotspotDragState = {
       nodeId,
       hotspotId: hotspot.id,
       startX: e.clientX,
       startY: e.clientY,
       initialRect: { ...hotspot.rect },
       nodeSize: { ...nodeSize }
    };

    setHotspotDragState(newHotspotDragState);
    stateRef.current.hotspotDragState = newHotspotDragState;
  };

  const handleHotspotResizeMouseDown = (
    e: React.MouseEvent, 
    nodeId: string, 
    hotspot: Hotspot, 
    nodeSize: Vector2,
    handle: 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;

    startEditing(nodeId);

    const newResizeState = {
        nodeId,
        hotspotId: hotspot.id,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        initialRect: { ...hotspot.rect },
        nodeSize: { ...nodeSize }
    };

    setHotspotResizeState(newResizeState);
    stateRef.current.hotspotResizeState = newResizeState;
  };

  const handleHandleMouseDown = useCallback((e: React.MouseEvent, nodeId: string, handleId?: string) => {
     e.preventDefault(); 
     e.stopPropagation(); 
     
     const node = story.segments.find(s => s.id === story.activeSegmentId)?.nodes[nodeId];
     if(!node) return;

     // Re-calc helper for this specific event
     const getPos = (type: 'input' | 'output') => {
        // Reuse the same logic as render
        const BORDER = LAYOUT.BORDER;
        const PADDING = LAYOUT.PADDING;
        const ITEM_HEIGHT = LAYOUT.ITEM_HEIGHT;
        const ITEM_GAP = LAYOUT.ITEM_GAP;
        const BRANCH_GAP = LAYOUT.BRANCH_GAP;
        const HEADER_HEIGHT = LAYOUT.HEADER_HEIGHT;

        if (type === 'input') {
            return { x: node.position.x, y: node.position.y + node.size.y / 2 };
        } else {
            if (node.type === NodeType.START) {
              // Start node only has output
              return { x: node.position.x + node.size.x, y: node.position.y + node.size.y / 2 };
            }
            if (node.type === NodeType.DIALOGUE && handleId) {
                const choices = (node as DialogueNode).choices;
                const choiceIndex = choices.findIndex(c => c.id === handleId);
                if (choiceIndex === -1) return { x: node.position.x + node.size.x, y: node.position.y };
                const reverseIndex = choices.length - 1 - choiceIndex;
                const offsetFromBottom = BORDER + PADDING + (reverseIndex * (ITEM_HEIGHT + ITEM_GAP)) + (ITEM_HEIGHT / 2);
                return { x: node.position.x + node.size.x - 2, y: node.position.y + node.size.y - offsetFromBottom };
            }
            if (node.type === NodeType.BRANCH) {
                const conditions = (node as BranchNode).conditions || [];
                const LABEL_HEIGHT = 16;
                const LABEL_MARGIN = 8;
                const listStart = BORDER + HEADER_HEIGHT + PADDING + LABEL_HEIGHT + LABEL_MARGIN;
                
                if (handleId) {
                    const index = conditions.findIndex(c => c.id === handleId);
                    if (index !== -1) {
                        const offsetFromTop = listStart + (index * (ITEM_HEIGHT + BRANCH_GAP)) + (ITEM_HEIGHT / 2);
                        return { x: node.position.x + node.size.x - 2, y: node.position.y + offsetFromTop };
                    }
                } else {
                     let listHeight = conditions.length > 0 ? (conditions.length * ITEM_HEIGHT) + ((conditions.length - 1) * BRANCH_GAP) : ITEM_HEIGHT;
                     const elseMargin = 8;
                     const offsetFromTop = listStart + listHeight + elseMargin + (ITEM_HEIGHT / 2);
                     return { x: node.position.x + node.size.x - 2, y: node.position.y + offsetFromTop };
                }
            }
            if (node.type === NodeType.LOCATION && handleId) {
                 const events = (node as LocationNode).events || [];
                 const eventIndex = events.findIndex(e => e.id === handleId);
                 if (eventIndex === -1) return { x: node.position.x + node.size.x, y: node.position.y };
                 const reverseIndex = events.length - 1 - eventIndex;
                 const offsetFromBottom = BORDER + PADDING + (reverseIndex * (ITEM_HEIGHT + ITEM_GAP)) + (ITEM_HEIGHT / 2);
                 return { x: node.position.x + node.size.x - 2, y: node.position.y + node.size.y - offsetFromBottom };
            }
            return { x: node.position.x + node.size.x, y: node.position.y + node.size.y / 2 };
        }
     };

     const startPos = getPos('output');
     
     // Calc mouse pos
     const rect = containerRef.current?.getBoundingClientRect();
     const offsetX = rect ? rect.left : 0;
     const offsetY = rect ? rect.top : 0;
     const mouseCanvasPos = {
        x: (e.clientX - offsetX - canvasTransform.x) / canvasTransform.scale,
        y: (e.clientY - offsetY - canvasTransform.y) / canvasTransform.scale
     };

     const newLinkingState = {
         sourceNodeId: nodeId,
         sourceHandleId: handleId,
         startPos,
         mousePos: mouseCanvasPos
     };

     setLinkingState(newLinkingState);
     stateRef.current.linkingState = newLinkingState;
     setShowLogicMenu(false);
  }, [story, canvasTransform]);

  const handleInputMouseUp = useCallback((e: React.MouseEvent, targetNodeId: string) => {
    const currentLinking = stateRef.current.linkingState;
    if (currentLinking) {
        e.stopPropagation(); 
        if (currentLinking.sourceNodeId !== targetNodeId) {
           addEdge(currentLinking.sourceNodeId, targetNodeId, currentLinking.sourceHandleId);
        }
        setLinkingState(null);
        stateRef.current.linkingState = null;
    }
  }, [addEdge]);

  const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
      e.stopPropagation();
      selectNode(edgeId, e.shiftKey);
      setShowLogicMenu(false);
  };

  // --- Drag and Drop Creation ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType') as NodeType;
    if (type) {
       const pos = getCanvasMousePos(e.clientX, e.clientY);
       addNode(type, { x: pos.x - 150, y: pos.y - 75 });
    }
  };

  const onDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleAddNode = (type: NodeType) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const viewportWidth = rect ? rect.width : window.innerWidth;
    const viewportHeight = rect ? rect.height : window.innerHeight;

    const centerX = (viewportWidth / 2 - canvasTransform.x) / canvasTransform.scale;
    const centerY = (viewportHeight / 2 - canvasTransform.y) / canvasTransform.scale;
    
    addNode(type, { x: centerX - 150, y: centerY - 100 });
    setShowLogicMenu(false);
  };

  // --- Rendering Helpers ---

  const getNodeHandlePosition = (nodeId: string, handleId?: string, type: 'input' | 'output' = 'output') => {
    const node = activeSegment?.nodes[nodeId];
    if (!node) return { x: 0, y: 0 };

    const { BORDER, PADDING, ITEM_HEIGHT, ITEM_GAP, BRANCH_GAP, HEADER_HEIGHT } = LAYOUT;

    if (type === 'input') {
      return { x: node.position.x, y: node.position.y + node.size.y / 2 };
    } else {
      if (node.type === NodeType.START) {
        return { x: node.position.x + node.size.x, y: node.position.y + node.size.y / 2 };
      }

      if (node.type === NodeType.DIALOGUE && handleId) {
        const choices = (node as DialogueNode).choices;
        const choiceIndex = choices.findIndex(c => c.id === handleId);
        if (choiceIndex === -1) return { x: node.position.x + node.size.x, y: node.position.y };
        
        const reverseIndex = choices.length - 1 - choiceIndex;
        const offsetFromBottom = BORDER + PADDING + (reverseIndex * (ITEM_HEIGHT + ITEM_GAP)) + (ITEM_HEIGHT / 2);
        
        return { 
            x: node.position.x + node.size.x - 2, 
            y: node.position.y + node.size.y - offsetFromBottom
        };
      }

      if (node.type === NodeType.BRANCH) {
        const conditions = (node as BranchNode).conditions || [];
        const LABEL_HEIGHT = 16;
        const LABEL_MARGIN = 8;
        const listStart = BORDER + HEADER_HEIGHT + PADDING + LABEL_HEIGHT + LABEL_MARGIN;
        
        if (handleId) {
            const index = conditions.findIndex(c => c.id === handleId);
            if (index !== -1) {
                const offsetFromTop = listStart + (index * (ITEM_HEIGHT + BRANCH_GAP)) + (ITEM_HEIGHT / 2);
                return { x: node.position.x + node.size.x - 2, y: node.position.y + offsetFromTop };
            }
        } else {
             let listHeight = conditions.length > 0 ? (conditions.length * ITEM_HEIGHT) + ((conditions.length - 1) * BRANCH_GAP) : ITEM_HEIGHT;
             const elseMargin = 8;
             const offsetFromTop = listStart + listHeight + elseMargin + (ITEM_HEIGHT / 2);
             return { x: node.position.x + node.size.x - 2, y: node.position.y + offsetFromTop };
        }
      }

      if (node.type === NodeType.LOCATION && handleId) {
         const events = (node as LocationNode).events || [];
         const eventIndex = events.findIndex(e => e.id === handleId);
         if (eventIndex === -1) return { x: node.position.x + node.size.x, y: node.position.y };
         const reverseIndex = events.length - 1 - eventIndex;
         const offsetFromBottom = BORDER + PADDING + (reverseIndex * (ITEM_HEIGHT + ITEM_GAP)) + (ITEM_HEIGHT / 2);
         return { x: node.position.x + node.size.x - 2, y: node.position.y + node.size.y - offsetFromBottom };
      }

      return { x: node.position.x + node.size.x, y: node.position.y + node.size.y / 2 };
    }
  };

  const renderNodeContent = (node: NarrativeNode) => {
    const isSelected = selectedIds.includes(node.id);
    const { ITEM_HEIGHT, ITEM_GAP } = LAYOUT;

    switch (node.type) {
      case NodeType.START:
        return (
          <div className="flex flex-col justify-center h-full">
            <div className="text-[10px] text-emerald-300 text-center opacity-80">
              Entry point
            </div>
          </div>
        );

      case NodeType.DIALOGUE:
        return (
          <>
            <div className="font-bold text-zinc-500 mb-1 shrink-0">
              {story.characters.find(c => c.id === (node as DialogueNode).characterId)?.name}
            </div>
            <div className="italic opacity-80 mb-[8px] min-h-[48px] whitespace-pre-wrap">
              "{(node as DialogueNode).text}"
            </div>
            <div className="flex flex-col mt-auto shrink-0" style={{ gap: ITEM_GAP }}>
              {(node as DialogueNode).choices?.map((c) => (
                <div key={c.id} className="relative flex items-center justify-end shrink-0 group/choice" style={{ height: ITEM_HEIGHT }}>
                    <div className="bg-black/20 px-2 py-1 rounded text-[10px] text-indigo-300 border border-indigo-500/20 w-full text-right truncate h-full flex items-center justify-end">
                      {c.text}
                    </div>
                    <div 
                      className="absolute -right-[18px] top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-600 border border-zinc-900 rounded-full hover:scale-125 transition-transform cursor-crosshair z-20"
                      onMouseDown={(e) => handleHandleMouseDown(e, node.id, c.id)}
                    />
                </div>
              ))}
            </div>
          </>
        );
      
      case NodeType.LOCATION:
        const locNode = node as LocationNode;
        return (
          <div className="flex flex-col h-full">
            <div className="w-full aspect-video shrink-0 relative bg-zinc-900 rounded border border-zinc-700/50 overflow-hidden group/image select-none">
                {locNode.backgroundImage ? (
                  <img 
                    src={locNode.backgroundImage} 
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/image:opacity-100 transition-opacity pointer-events-none" 
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-[10px]">No Image</div>
                )}
                
                {/* Hotspot Overlay */}
                {locNode.hotspots?.map(hs => (
                   <div 
                     key={hs.id}
                     onMouseDown={(e) => handleHotspotMouseDown(e, node.id, hs, node.size)}
                     className={`absolute border transition-colors cursor-move z-10 flex items-center justify-center overflow-hidden group/hotspot pointer-events-auto ${
                        isSelected 
                          ? 'border-amber-400 bg-amber-400/10' 
                          : 'border-transparent group-hover/image:border-amber-400/30 hover:!border-amber-400 hover:!bg-amber-400/10'
                     }`}
                     style={{
                        left: `${hs.rect.x}%`,
                        top: `${hs.rect.y}%`,
                        width: `${hs.rect.w}%`,
                        height: `${hs.rect.h}%`
                     }}
                     title={`Hotspot: ${hs.name} (Drag to move)`}
                   >
                     {hs.image && (
                        <img src={hs.image} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                     )}
                     
                     <div className="absolute inset-0 opacity-0 group-hover/hotspot:opacity-100 transition-opacity">
                        <div className="absolute top-0 left-0 w-2 h-2 bg-white border border-black cursor-nwse-resize -translate-x-1/2 -translate-y-1/2" 
                             onMouseDown={(e) => handleHotspotResizeMouseDown(e, node.id, hs, node.size, 'nw')} />
                        <div className="absolute top-0 right-0 w-2 h-2 bg-white border border-black cursor-nesw-resize translate-x-1/2 -translate-y-1/2" 
                             onMouseDown={(e) => handleHotspotResizeMouseDown(e, node.id, hs, node.size, 'ne')} />
                        <div className="absolute bottom-0 left-0 w-2 h-2 bg-white border border-black cursor-nesw-resize -translate-x-1/2 translate-y-1/2" 
                             onMouseDown={(e) => handleHotspotResizeMouseDown(e, node.id, hs, node.size, 'sw')} />
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-white border border-black cursor-nwse-resize translate-x-1/2 translate-y-1/2" 
                             onMouseDown={(e) => handleHotspotResizeMouseDown(e, node.id, hs, node.size, 'se')} />
                     </div>
                   </div>
                ))}
            </div>
            
            {/* Event List */}
            {locNode.events && locNode.events.length > 0 ? (
               <div className="flex flex-col mt-[4px] shrink-0" style={{ gap: ITEM_GAP }}>
                 {locNode.events.map(evt => (
                    <div key={evt.id} className="relative flex items-center justify-between shrink-0" style={{ height: ITEM_HEIGHT }}>
                       <div className="flex items-center gap-1.5 px-2 bg-black/20 border border-zinc-700 rounded h-full w-full">
                          <Zap className={`w-3 h-3 ${evt.trigger === 'onClick' ? 'text-amber-400' : 'text-indigo-400'}`} />
                          <span className="text-[10px] text-zinc-300 truncate">{evt.label}</span>
                       </div>
                       <div 
                          className="absolute -right-[18px] top-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-500 border border-zinc-900 rounded-full hover:scale-125 transition-transform cursor-crosshair z-20"
                          onMouseDown={(e) => handleHandleMouseDown(e, node.id, evt.id)}
                        />
                    </div>
                 ))}
               </div>
            ) : (
               <div className="p-1 text-center text-[10px] text-zinc-500 shrink-0 opacity-50">No Events</div>
            )}
          </div>
        );

      case NodeType.BRANCH:
        const branchNode = node as BranchNode;
        return (
          <div className="flex flex-col h-full">
            <div className="text-[10px] text-zinc-500 mb-[8px] italic leading-[16px] h-[16px] block shrink-0 whitespace-nowrap overflow-hidden">Evaluation Order:</div>
            
            <div className="flex flex-col" style={{ gap: LAYOUT.BRANCH_GAP }}>
              {branchNode.conditions?.map((c, idx) => {
                const varName = story.globalVariables.find(v => v.id === c.variableId)?.name || '???';
                
                return (
                  <div key={c.id} className="relative flex items-center shrink-0" style={{ height: ITEM_HEIGHT }}>
                    <div className="bg-black/20 px-2 rounded text-[10px] text-zinc-300 border border-amber-500/20 w-full truncate font-mono h-full flex items-center gap-1">
                      <span className="text-amber-500 font-bold">{idx + 1}.</span>
                      <span className="text-purple-400">{varName}</span>
                      <span className="text-amber-300">{c.operator}</span>
                      <span className="text-green-300">{c.value}</span>
                    </div>
                    <div 
                      className="absolute -right-[18px] top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-600 border border-zinc-900 rounded-full hover:scale-125 transition-transform cursor-crosshair z-20"
                      onMouseDown={(e) => handleHandleMouseDown(e, node.id, c.id)}
                    />
                  </div>
                );
              })}
              {(!branchNode.conditions?.length) && (
                <div className="text-xs text-zinc-600 text-center flex items-center justify-center" style={{ height: ITEM_HEIGHT }}>No conditions</div>
              )}
            </div>
             
            <div className="relative flex items-center shrink-0 mt-[8px]" style={{ height: ITEM_HEIGHT }}>
                <div className="bg-white/5 px-2 rounded text-[10px] text-zinc-500 border border-zinc-700/50 w-full truncate font-mono italic h-full flex items-center">
                    else
                </div>
                <div 
                    className="absolute -right-[18px] top-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-500 border border-zinc-900 rounded-full hover:scale-125 transition-transform cursor-crosshair z-20"
                    onMouseDown={(e) => handleHandleMouseDown(e, node.id, undefined)} 
                />
            </div>
          </div>
        );

      case NodeType.SET_VARIABLE:
        const setVarNode = node as VariableSetterNode;
        return (
          <div className="flex flex-col justify-center h-full space-y-2">
             <div className="flex items-center gap-2 bg-black/20 p-1 rounded border border-purple-500/20">
               <span className="text-purple-400 font-mono">{setVarNode.variableName}</span>
             </div>
             <div className="text-center font-bold text-zinc-500 text-[10px]">{setVarNode.operator}</div>
             <div className="flex items-center gap-2 bg-black/20 p-1 rounded border border-zinc-700">
               <span className="text-zinc-300 font-mono">{setVarNode.value}</span>
             </div>
          </div>
        );
      
      case NodeType.JUMP:
        const jumpNode = node as JumpNode;
        const targetSeg = story.segments.find(s => s.id === jumpNode.targetSegmentId);
        return (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-rose-300 bg-rose-900/20 px-3 py-2 rounded-full border border-rose-500/30">
               <ArrowRightCircle className="w-4 h-4" />
               <span className="font-bold truncate max-w-[120px]">
                 {targetSeg ? targetSeg.name : 'Select Target'}
               </span>
            </div>
          </div>
        );

      case NodeType.ACTION:
        const actionNode = node as ActionNode;
        return (
          <div className="flex flex-col h-full overflow-hidden">
             <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {actionNode.commands.map((cmd, idx) => {
                  let Icon = MessageSquare;
                  let Color = "text-zinc-400";
                  if (cmd.type === 'playSound') { Icon = Zap; Color = "text-pink-400"; }
                  if (cmd.type === 'wait') { Icon = Timer; Color = "text-blue-400"; }
                  if (cmd.type === 'screenShake') { Icon = Smartphone; Color = "text-orange-400"; }
                  if (cmd.type === 'showToast') { Icon = MessageSquare; Color = "text-green-400"; }
                  
                  return (
                    <div key={cmd.id} className="flex items-center gap-2 bg-black/20 p-1.5 rounded border border-zinc-700/50 text-[10px]">
                       <span className="text-zinc-600 font-mono w-4 text-center">{idx + 1}</span>
                       <Icon className={`w-3 h-3 ${Color}`} />
                       <span className="truncate text-zinc-300 font-mono">{cmd.type}</span>
                    </div>
                  );
                })}
                {actionNode.commands.length === 0 && (
                   <div className="text-center text-zinc-600 italic text-[10px] mt-4">Empty Sequence</div>
                )}
             </div>
          </div>
        );

      default:
        return <div className="text-zinc-500 text-center mt-4">Unknown Node</div>;
    }
  };

  const getNodeColorClass = useCallback((type: NodeType) => {
    switch(type) {
      case NodeType.START: return 'bg-emerald-800/80 text-white';
      case NodeType.LOCATION: return 'bg-emerald-900/50 text-emerald-400';
      case NodeType.BRANCH: return 'bg-amber-900/50 text-amber-400';
      case NodeType.SET_VARIABLE: return 'bg-purple-900/50 text-purple-400';
      case NodeType.JUMP: return 'bg-rose-900/50 text-rose-400';
      case NodeType.ACTION: return 'bg-slate-900/80 text-cyan-400';
      default: return 'bg-indigo-900/50 text-indigo-400';
    }
  }, []);

  const getNodeIcon = useCallback((type: NodeType) => {
    switch(type) {
      case NodeType.START: return <Play className="w-3 h-3 fill-current" />;
      case NodeType.LOCATION: return <ImageIcon className="w-3 h-3" />;
      case NodeType.BRANCH: return <GitGraph className="w-3 h-3" />;
      case NodeType.SET_VARIABLE: return <Variable className="w-3 h-3" />;
      case NodeType.JUMP: return <ArrowRightCircle className="w-3 h-3" />;
      case NodeType.ACTION: return <Clapperboard className="w-3 h-3" />;
      default: return <Type className="w-3 h-3" />;
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-[#121212] overflow-hidden relative cursor-crosshair"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundSize: `${20 * canvasTransform.scale}px ${20 * canvasTransform.scale}px`,
          backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
          backgroundPosition: `${canvasTransform.x}px ${canvasTransform.y}px`
        }}
      />

      {/* Canvas Content */}
      <div 
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`
        }}
      >
        {/* SVG Layer for Edges */}
        <svg className="absolute top-0 left-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
             <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
            </marker>
          </defs>
          
          {edges.map(edge => {
            const start = getNodeHandlePosition(edge.sourceNodeId, edge.sourceHandleId, 'output');
            const end = getNodeHandlePosition(edge.targetNodeId, undefined, 'input');
            const isSelected = selectedIds.includes(edge.id);
            
            return (
              <g key={edge.id} className="pointer-events-auto cursor-pointer" onMouseDown={(e) => handleEdgeClick(e, edge.id)}>
                <path
                  d={getBezierPath(start, end, 80)}
                  stroke="transparent"
                  strokeWidth="15"
                  fill="none"
                />
                <path
                  d={getBezierPath(start, end, 80)}
                  stroke={isSelected ? "#f43f5e" : "#4f46e5"}
                  strokeWidth={isSelected ? "3" : "2"}
                  fill="none"
                  markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                  className="transition-colors duration-150"
                  style={{ opacity: isSelected ? 1 : 0.6 }}
                />
              </g>
            );
          })}

          {linkingState && (
              <path
                d={getBezierPath(linkingState.startPos, linkingState.mousePos, 80)}
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
                className="pointer-events-none" 
              />
          )}
        </svg>

        {/* Nodes Layer */}
        {nodes.map(node => (
            <NodeComponent 
                key={node.id}
                node={node}
                selected={selectedIds.includes(node.id)}
                onMouseDown={handleNodeMouseDown}
                onMouseUp={handleInputMouseUp}
                onHandleMouseDown={handleHandleMouseDown}
                renderContent={renderNodeContent}
                getNodeColorClass={getNodeColorClass}
                getNodeIcon={getNodeIcon}
            />
        ))}
      </div>

      {/* Toolbar HUD - Grouped with Dropdown */}
      <div 
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 flex items-center p-1 gap-1 z-30 select-none pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button 
          className="p-2 hover:bg-zinc-700 rounded text-white" 
          title="选择 (V)"
          onClick={() => clearSelection()}
        >
          <MousePointer2 className="w-4 h-4" />
        </button>
        
        <div className="w-px h-4 bg-zinc-700 mx-1"></div>
        
        <button 
          draggable
          onDragStart={(e) => onDragStart(e, NodeType.DIALOGUE)}
          className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white cursor-grab active:cursor-grabbing flex items-center gap-1" 
          title="对话 (Drag to create)"
          onClick={() => handleAddNode(NodeType.DIALOGUE)}
        >
          <Type className="w-4 h-4" />
          <span className="text-[10px] font-semibold hidden sm:inline"></span>
        </button>
        <button 
          draggable
          onDragStart={(e) => onDragStart(e, NodeType.LOCATION)}
          className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white cursor-grab active:cursor-grabbing flex items-center gap-1"
          title="场景 (Drag to create)"
          onClick={() => handleAddNode(NodeType.LOCATION)}
        >
          <ImageIcon className="w-4 h-4" />
          <span className="text-[10px] font-semibold hidden sm:inline"></span>
        </button>

        <div className="w-px h-4 bg-zinc-700 mx-1"></div>

        <div className="relative">
          <button 
            className={`p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white flex items-center gap-1 ${showLogicMenu ? 'bg-zinc-700 text-white' : ''}`}
            onClick={() => setShowLogicMenu(!showLogicMenu)}
            title="高级逻辑"
          >
            <Layers className="w-4 h-4" />
            <span className="text-[10px] font-semibold hidden sm:inline"></span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
          </button>

          {showLogicMenu && (
            <div className="absolute top-full left-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-1 flex flex-col gap-1 min-w-[140px]">
               <button 
                draggable
                onDragStart={(e) => onDragStart(e, NodeType.BRANCH)}
                className="flex items-center gap-2 p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-amber-400 text-left w-full cursor-grab active:cursor-grabbing"
                onClick={() => handleAddNode(NodeType.BRANCH)}
              >
                <GitGraph className="w-4 h-4" />
                <span className="text-xs">分支判断</span>
              </button>
               <button 
                draggable
                onDragStart={(e) => onDragStart(e, NodeType.SET_VARIABLE)}
                className="flex items-center gap-2 p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-purple-400 text-left w-full cursor-grab active:cursor-grabbing"
                onClick={() => handleAddNode(NodeType.SET_VARIABLE)}
              >
                <Variable className="w-4 h-4" />
                <span className="text-xs">变量设置</span>
              </button>
               <button 
                draggable
                onDragStart={(e) => onDragStart(e, NodeType.ACTION)}
                className="flex items-center gap-2 p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-cyan-400 text-left w-full cursor-grab active:cursor-grabbing"
                onClick={() => handleAddNode(NodeType.ACTION)}
              >
                <Clapperboard className="w-4 h-4" />
                <span className="text-xs">动作序列</span>
              </button>
               <button 
                draggable
                onDragStart={(e) => onDragStart(e, NodeType.JUMP)}
                className="flex items-center gap-2 p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-rose-400 text-left w-full cursor-grab active:cursor-grabbing"
                onClick={() => handleAddNode(NodeType.JUMP)}
              >
                <ArrowRightCircle className="w-4 h-4" />
                <span className="text-xs">章节跳转</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div 
        className="absolute bottom-4 left-4 flex flex-col gap-2 z-30 pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
         <div className="bg-zinc-800 rounded-md shadow-lg border border-zinc-700 flex flex-col p-1">
            <button 
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
              onClick={() => setCanvasTransform({...canvasTransform, scale: Math.min(canvasTransform.scale + 0.1, 5)})}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-px w-4 bg-zinc-700 mx-1"></div>
            <button 
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
              onClick={() => setCanvasTransform({...canvasTransform, scale: Math.max(canvasTransform.scale - 0.1, 0.1)})}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
         </div>
      </div>
    </div>
  );
};

export default Canvas;