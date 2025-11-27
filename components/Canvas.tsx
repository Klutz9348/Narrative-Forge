import React, { useState, useRef, useEffect } from 'react';
import { MousePointer2, Type, Image as ImageIcon, ZoomIn, ZoomOut, Zap } from 'lucide-react';
import { NodeType, NarrativeNode, Vector2, DialogueNode } from '../types';
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
    updateNode, 
    setCanvasTransform,
    pushHistory 
  } = useEditorStore();

  const activeSegment = story.segments.find(s => s.id === story.activeSegmentId);
  const nodes = activeSegment ? (Object.values(activeSegment.nodes) as NarrativeNode[]) : [];
  const edges = activeSegment ? activeSegment.edges : [];

  const [isPanning, setIsPanning] = useState(false);
  const [dragState, setDragState] = useState<{ nodeId: string, startX: number, startY: number, initialPos: Vector2 } | null>(null);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Interaction Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newScale = Math.min(Math.max(0.1, canvasTransform.scale - e.deltaY * zoomSensitivity), 5);
      setCanvasTransform({ ...canvasTransform, scale: newScale });
    } else {
      // Pan
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
    } else if (e.target === containerRef.current) {
        // Click on empty space
        selectNode('', false); // Clear selection by passing empty id, or we need a clearSelection action
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setCanvasTransform({ 
        ...canvasTransform, 
        x: canvasTransform.x + dx, 
        y: canvasTransform.y + dy 
      });
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (dragState) {
      const dx = (e.clientX - dragState.startX) / canvasTransform.scale;
      const dy = (e.clientY - dragState.startY) / canvasTransform.scale;
      updateNode(dragState.nodeId, {
        position: {
          x: Math.round(dragState.initialPos.x + dx),
          y: Math.round(dragState.initialPos.y + dy)
        }
      });
    }
  };

  const handleMouseUp = () => {
    if (dragState) {
      pushHistory(); // Commit change to history after drag
    }
    setIsPanning(false);
    setDragState(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: NarrativeNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    selectNode(node.id, e.shiftKey);
    setDragState({
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      initialPos: { ...node.position }
    });
  };

  // --- Rendering Helpers ---

  // Calculate handle positions for edges
  const getNodeHandlePosition = (nodeId: string, handleId?: string, type: 'input' | 'output' = 'output') => {
    const node = activeSegment?.nodes[nodeId];
    if (!node) return { x: 0, y: 0 };

    if (type === 'input') {
      return { x: node.position.x, y: node.position.y + node.size.y / 2 };
    } else {
      // Output
      if (node.type === NodeType.DIALOGUE && handleId) {
        // Find which choice index this is
        const choiceIndex = (node as DialogueNode).choices.findIndex(c => c.id === handleId);
        // Estimate position based on choice list rendered height. This is an approximation.
        // A better way is using refs to actual DOM elements, but for MVP we approximate.
        // Header ~24px, Padding ~12px, Text ~variable.
        // Let's just distribute handles along the right side for now or fix them.
        // Simple approximation: Distribute evenly or place at specific estimated height.
        // Let's try placing them relative to the bottom half of the node.
        const offsetPerChoice = 24;
        const startY = node.size.y - ((node as DialogueNode).choices.length * offsetPerChoice) - 10; 
        return { 
            x: node.position.x + node.size.x, 
            y: node.position.y + startY + (choiceIndex * offsetPerChoice) + 10
        };
      }
      return { x: node.position.x + node.size.x, y: node.position.y + node.size.y / 2 };
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-[#121212] overflow-hidden relative cursor-crosshair"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
          </defs>
          {edges.map(edge => {
            const start = getNodeHandlePosition(edge.sourceNodeId, edge.sourceHandleId, 'output');
            const end = getNodeHandlePosition(edge.targetNodeId, undefined, 'input');
            return (
              <g key={edge.id}>
                <path
                  d={getBezierPath(start, end, 80)}
                  stroke="#4f46e5"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {nodes.map(node => (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
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
            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-600 border border-zinc-900 rounded-full hover:bg-indigo-500 z-10" />

            {/* Default Output Handle (Right) - Only if not a choice node or if needed as fallback */}
            {node.type !== NodeType.DIALOGUE && (
               <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-600 border border-zinc-900 rounded-full hover:bg-indigo-500 z-10" />
            )}

            {/* Node Header */}
            <div className={`h-6 px-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider shrink-0
              ${node.type === NodeType.LOCATION ? 'bg-emerald-900/50 text-emerald-400' : 'bg-indigo-900/50 text-indigo-400'}
            `}>
              {node.type === NodeType.LOCATION ? <ImageIcon className="w-3 h-3" /> : <Type className="w-3 h-3" />}
              <span className="truncate flex-1">{node.name}</span>
            </div>

            {/* Node Content */}
            <div className="p-3 text-zinc-300 text-xs flex-1 overflow-hidden relative">
              {node.type === NodeType.DIALOGUE ? (
                <div className="flex flex-col h-full">
                  <div className="font-bold text-zinc-500 mb-1">
                    {story.characters.find(c => c.id === (node as DialogueNode).characterId)?.name}
                  </div>
                  <div className="italic opacity-80 line-clamp-3 mb-2 flex-1">"{(node as DialogueNode).text}"</div>
                  
                  {/* Choices rendering matching visual handles */}
                  <div className="space-y-1 mt-auto">
                    {(node as DialogueNode).choices?.map((c, idx) => (
                      <div key={c.id} className="relative flex items-center justify-end">
                         <div className="bg-black/20 px-2 py-1 rounded text-[10px] text-indigo-300 border border-indigo-500/20 w-full text-right truncate">
                            {c.text}
                          </div>
                          {/* Output Handle for Choice */}
                          <div className="absolute -right-[18px] w-3 h-3 bg-indigo-600 border border-zinc-900 rounded-full hover:scale-125 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 flex items-center p-1 gap-1">
        <button className="p-2 hover:bg-zinc-700 rounded text-white" title="选择 (V)"><MousePointer2 className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-zinc-700 mx-1"></div>
        <button className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white" title="新建节点"><Type className="w-4 h-4" /></button>
        <button className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"><Zap className="w-4 h-4" /></button>
      </div>

      {/* Zoom Controls HUD */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
         <div className="bg-zinc-800 rounded-md shadow-lg border border-zinc-700 flex flex-col p-1">
            <button 
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
              onClick={() => setCanvasTransform({...canvasTransform, scale: Math.min(canvasTransform.scale + 0.1, 5)})}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-px w-4 bg-zinc-700 mx-auto"></div>
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