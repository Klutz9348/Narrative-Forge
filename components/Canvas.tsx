
import React, { useState, useRef, useEffect } from 'react';
import { MousePointer2, Type, Image as ImageIcon, ZoomIn, ZoomOut, GitGraph, Variable, ArrowRightCircle } from 'lucide-react';
import { NodeType, NarrativeNode, Vector2, DialogueNode, BranchNode, VariableSetterNode, JumpNode } from '../types';
import { useEditorStore } from '../store/useEditorStore';

// Bezier Curve Helper
const getBezierPath = (
  start: Vector2,
  end: Vector2,
  controlOffset: number = 50
) => {
  return `M${start.x},${start.y} C${start.x + controlOffset},${start.y} ${end.x - controlOffset},${end.y} ${end.x},${end.y}`;
};

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
  const [linkingState, setLinkingState] = useState<{
    sourceNodeId: string;
    sourceHandleId?: string;
    startPos: Vector2;
    mousePos: Vector2;
  } | null>(null);

  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- CRITICAL: State Ref for Global Listeners ---
  // We use this to bypass React's closure staleness and async updates in event listeners.
  const stateRef = useRef({
    canvasTransform,
    dragState,
    linkingState,
    isPanning,
    panStart
  });

  // Keep Ref in sync with React state for reads that happen later (passive updates)
  useEffect(() => {
    stateRef.current = { ...stateRef.current, canvasTransform, isPanning, panStart };
    // Note: We don't sync dragState/linkingState here to avoid overwriting the 
    // immediate manual updates we do in handlers with stale React state.
    // Instead, handlers update both State and Ref simultaneously.
  }, [canvasTransform, isPanning, panStart]);

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
      // Always read from the Ref to get the absolute latest state
      const current = stateRef.current;
      
      // Safety Check: If buttons are 0 (mouse released), force cleanup.
      // This fixes the "sticky" issue if the mouseup event was missed.
      if (e.buttons === 0 && (current.dragState || current.isPanning)) {
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
        // Update ref for next frame consistency
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
      else if (current.linkingState) {
        // Calculate mouse position in canvas space, accounting for container offset
        const rect = containerRef.current?.getBoundingClientRect();
        const offsetX = rect ? rect.left : 0;
        const offsetY = rect ? rect.top : 0;

        const pos = {
          x: (e.clientX - offsetX - current.canvasTransform.x) / current.canvasTransform.scale,
          y: (e.clientY - offsetY - current.canvasTransform.y) / current.canvasTransform.scale
        };
        
        // Update React state to trigger render
        setLinkingState({ ...current.linkingState, mousePos: pos });
        // Update Ref immediately so next event sees it
        stateRef.current.linkingState = { ...current.linkingState, mousePos: pos };
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      const current = stateRef.current;

      if (current.dragState) {
        commitEditing(); 
        setDragState(null);
        stateRef.current.dragState = null; // Clear ref immediately
      }
      
      if (current.isPanning) {
        setIsPanning(false);
        stateRef.current.isPanning = false; // Clear ref immediately
      }

      // If linking and we hit window (not a node input), cancel
      if (current.linkingState) {
         setLinkingState(null);
         stateRef.current.linkingState = null; // Clear ref immediately
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []); // Empty dependency array = listeners bound once

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
    } else if (e.target === containerRef.current) {
        clearSelection();
    }
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

  const handleNodeMouseDown = (e: React.MouseEvent, node: NarrativeNode) => {
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

    // Update BOTH React State and Ref immediately
    setDragState(newDragState);
    stateRef.current.dragState = newDragState;
  };

  const handleHandleMouseDown = (e: React.MouseEvent, nodeId: string, handleId?: string) => {
     e.preventDefault(); 
     e.stopPropagation(); 
     
     const startPos = getNodeHandlePosition(nodeId, handleId, 'output');
     const mouseCanvasPos = getCanvasMousePos(e.clientX, e.clientY);

     const newLinkingState = {
         sourceNodeId: nodeId,
         sourceHandleId: handleId,
         startPos,
         mousePos: mouseCanvasPos
     };

     // Update BOTH React State and Ref immediately to prevent input lag
     setLinkingState(newLinkingState);
     stateRef.current.linkingState = newLinkingState;
  };

  const handleInputMouseUp = (e: React.MouseEvent, targetNodeId: string) => {
    // Check ref directly for most up-to-date state
    const currentLinking = stateRef.current.linkingState;
    
    if (currentLinking) {
        e.stopPropagation(); // Stop propagation to prevent window listener from cancelling link
        if (currentLinking.sourceNodeId !== targetNodeId) {
           addEdge(currentLinking.sourceNodeId, targetNodeId, currentLinking.sourceHandleId);
        }
        setLinkingState(null);
        stateRef.current.linkingState = null;
    }
  };

  const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
      e.stopPropagation();
      selectNode(edgeId, e.shiftKey);
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
  };

  // --- Rendering Helpers ---

  const getNodeHandlePosition = (nodeId: string, handleId?: string, type: 'input' | 'output' = 'output') => {
    const node = activeSegment?.nodes[nodeId];
    if (!node) return { x: 0, y: 0 };

    if (type === 'input') {
      return { x: node.position.x, y: node.position.y + node.size.y / 2 };
    } else {
      // Logic for Multiple Outputs
      
      // 1. Dialogue Node Choices
      if (node.type === NodeType.DIALOGUE && handleId) {
        const choices = (node as DialogueNode).choices;
        const choiceIndex = choices.findIndex(c => c.id === handleId);
        if (choiceIndex === -1) return { x: node.position.x + node.size.x, y: node.position.y };
        
        // Match CSS visual alignment: 
        // Bottom-up calculation to match mt-auto
        // padding-bottom: 12px (p-3)
        // item height: 24px (h-6)
        // gap: 4px (gap-1)
        const reverseIndex = choices.length - 1 - choiceIndex;
        const offsetFromBottom = 12 + (reverseIndex * 28) + 12; // 28 = 24 + 4
        
        return { 
            x: node.position.x + node.size.x, 
            y: node.position.y + node.size.y - offsetFromBottom
        };
      }

      // 2. Branch Node Conditions
      if (node.type === NodeType.BRANCH && handleId) {
        const conditions = (node as BranchNode).conditions || [];
        const index = conditions.findIndex(c => c.id === handleId);
        if (index === -1) return { x: node.position.x + node.size.x, y: node.position.y };
        
        // Top-down calculation to match layout
        // Header height ~ 24px
        // Padding top 12px
        // Item height 24px + gap 8px (space-y-2)
        const offsetFromTop = 24 + 12 + (index * 32) + 12; 
        
        return {
          x: node.position.x + node.size.x,
          y: node.position.y + offsetFromTop
        };
      }

      // Default Single Output
      return { x: node.position.x + node.size.x, y: node.position.y + node.size.y / 2 };
    }
  };

  // --- Node Content Renderer ---
  const renderNodeContent = (node: NarrativeNode) => {
    switch (node.type) {
      case NodeType.DIALOGUE:
        return (
          <>
            <div className="font-bold text-zinc-500 mb-1 shrink-0">
              {story.characters.find(c => c.id === (node as DialogueNode).characterId)?.name}
            </div>
            <div className="italic opacity-80 line-clamp-3 mb-2 flex-1 min-h-0">
              "{(node as DialogueNode).text}"
            </div>
            <div className="flex flex-col gap-1 mt-auto shrink-0">
              {(node as DialogueNode).choices?.map((c) => (
                <div key={c.id} className="relative flex items-center justify-end h-6 shrink-0 group/choice">
                    <div className="bg-black/20 px-2 py-1 rounded text-[10px] text-indigo-300 border border-indigo-500/20 w-full text-right truncate h-full flex items-center justify-end">
                      {c.text}
                    </div>
                    {/* Output Handle for Choice */}
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
        return (
          <div className="w-full h-full relative">
              <img 
              src={(node as any).backgroundImage} 
              className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all" 
              draggable={false}
              />
              <div className="relative z-10 p-2 text-center text-zinc-400">
                场景预览
              </div>
          </div>
        );

      case NodeType.BRANCH:
        return (
          <div className="flex flex-col h-full">
            <div className="text-[10px] text-zinc-500 mb-2 italic">Evaluation Order:</div>
            <div className="flex flex-col space-y-2">
              {(node as BranchNode).conditions?.map((c, idx) => (
                <div key={c.id} className="relative flex items-center h-6 shrink-0">
                  <div className="bg-black/20 px-2 rounded text-[10px] text-amber-300 border border-amber-500/20 w-full truncate font-mono">
                    {idx + 1}. {c.expression}
                  </div>
                  {/* Output Handle for Condition */}
                  <div 
                    className="absolute -right-[18px] top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-600 border border-zinc-900 rounded-full hover:scale-125 transition-transform cursor-crosshair z-20"
                    onMouseDown={(e) => handleHandleMouseDown(e, node.id, c.id)}
                  />
                </div>
              ))}
              {(!(node as BranchNode).conditions?.length) && (
                <div className="text-xs text-zinc-600 text-center">No conditions</div>
              )}
            </div>
             {/* Default Exit (Optional, could be added as a static handle at bottom) */}
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

      default:
        return <div className="text-zinc-500 text-center mt-4">Unknown Node</div>;
    }
  };

  const getNodeColorClass = (type: NodeType) => {
    switch(type) {
      case NodeType.LOCATION: return 'bg-emerald-900/50 text-emerald-400';
      case NodeType.BRANCH: return 'bg-amber-900/50 text-amber-400';
      case NodeType.SET_VARIABLE: return 'bg-purple-900/50 text-purple-400';
      case NodeType.JUMP: return 'bg-rose-900/50 text-rose-400';
      default: return 'bg-indigo-900/50 text-indigo-400';
    }
  };

  const getNodeIcon = (type: NodeType) => {
    switch(type) {
      case NodeType.LOCATION: return <ImageIcon className="w-3 h-3" />;
      case NodeType.BRANCH: return <GitGraph className="w-3 h-3" />;
      case NodeType.SET_VARIABLE: return <Variable className="w-3 h-3" />;
      case NodeType.JUMP: return <ArrowRightCircle className="w-3 h-3" />;
      default: return <Type className="w-3 h-3" />;
    }
  };

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
        className="absolute inset-0 origin-top-left"
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
              <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={(e) => handleEdgeClick(e, edge.id)}>
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
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onMouseUp={(e) => handleInputMouseUp(e, node.id)} 
            className={`absolute border transition-shadow duration-150 group flex flex-col
              ${selectedIds.includes(node.id) ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-xl' : 'border-zinc-700 hover:border-zinc-500'}
              bg-zinc-800 rounded-md overflow-hidden
            `}
            style={{
              left: node.position.x,
              top: node.position.y,
              width: node.size.x,
              height: node.size.y,
              cursor: 'grab'
            }}
          >
            {/* Input Handle (Left) */}
            <div 
                className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-600 border border-zinc-900 rounded-full hover:bg-indigo-500 z-20 cursor-crosshair transition-transform hover:scale-125" 
                onMouseUp={(e) => handleInputMouseUp(e, node.id)}
            />

            {/* Default Output Handle (Right) - Only for types without specific list outputs */}
            {node.type !== NodeType.DIALOGUE && node.type !== NodeType.BRANCH && (
               <div 
                className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-600 border border-zinc-900 rounded-full hover:bg-indigo-500 z-20 cursor-crosshair transition-transform hover:scale-125" 
                onMouseDown={(e) => handleHandleMouseDown(e, node.id)}
               />
            )}

            {/* Node Header */}
            <div className={`h-6 px-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider shrink-0 ${getNodeColorClass(node.type)}`}>
              {getNodeIcon(node.type)}
              <span className="truncate flex-1">{node.name}</span>
            </div>

            {/* Node Content */}
            <div className="p-3 text-zinc-300 text-xs flex-1 overflow-hidden relative flex flex-col">
               {renderNodeContent(node)}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 flex items-center p-1 gap-1 z-30">
        <button className="p-2 hover:bg-zinc-700 rounded text-white" title="选择 (V)"><MousePointer2 className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-zinc-700 mx-1"></div>
        
        <button 
          draggable
          onDragStart={(e) => onDragStart(e, NodeType.DIALOGUE)}
          className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white cursor-grab active:cursor-grabbing" 
          title="对话"
          onClick={() => handleAddNode(NodeType.DIALOGUE)}
        >
          <Type className="w-4 h-4" />
        </button>
        <button 
          draggable
          onDragStart={(e) => onDragStart(e, NodeType.LOCATION)}
          className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white cursor-grab active:cursor-grabbing"
          title="场景"
          onClick={() => handleAddNode(NodeType.LOCATION)}
        >
          <ImageIcon className="w-4 h-4" />
        </button>
         <button 
          draggable
          onDragStart={(e) => onDragStart(e, NodeType.BRANCH)}
          className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-amber-400 cursor-grab active:cursor-grabbing"
          title="逻辑分支"
          onClick={() => handleAddNode(NodeType.BRANCH)}
        >
          <GitGraph className="w-4 h-4" />
        </button>
         <button 
          draggable
          onDragStart={(e) => onDragStart(e, NodeType.SET_VARIABLE)}
          className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-purple-400 cursor-grab active:cursor-grabbing"
          title="设置变量"
          onClick={() => handleAddNode(NodeType.SET_VARIABLE)}
        >
          <Variable className="w-4 h-4" />
        </button>
        <button 
          draggable
          onDragStart={(e) => onDragStart(e, NodeType.JUMP)}
          className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-rose-400 cursor-grab active:cursor-grabbing"
          title="跳转章节"
          onClick={() => handleAddNode(NodeType.JUMP)}
        >
          <ArrowRightCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom Controls HUD */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-30">
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
