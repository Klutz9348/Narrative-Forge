import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Box, 
  Layers, 
  Settings, 
  Play, 
  MousePointer2, 
  Type, 
  Image as ImageIcon,
  MoreVertical,
  Plus,
  Save,
  Wand2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { 
  StoryAsset, 
  SegmentAsset, 
  NodeType, 
  NarrativeNode, 
  Vector2, 
  DialogueNode 
} from './types';
import * as GeminiService from './services/geminiService';

// --- Constants & Initial Data ---

const INITIAL_STORY: StoryAsset = {
  id: 'story_1',
  title: '赛博东京之影',
  description: '发生在霓虹闪烁的未来的黑色侦探惊悚片。',
  activeSegmentId: 'seg_1',
  characters: [
    { id: 'char_1', name: 'K 探员', avatarUrl: 'https://picsum.photos/id/64/200/200' },
    { id: 'char_2', name: 'ARIA (AI)', avatarUrl: 'https://picsum.photos/id/237/200/200' }
  ],
  segments: [
    {
      id: 'seg_1',
      name: '第一章：来电',
      rootNodeId: 'node_1',
      nodes: {
        'node_1': {
          id: 'node_1',
          type: NodeType.LOCATION,
          name: 'K 的办公室',
          position: { x: 100, y: 100 },
          size: { x: 400, y: 300 },
          childrenIds: [],
          backgroundImage: 'https://picsum.photos/id/180/800/600',
          hotspots: []
        } as NarrativeNode,
        'node_2': {
          id: 'node_2',
          type: NodeType.DIALOGUE,
          name: '开场独白',
          position: { x: 150, y: 450 },
          size: { x: 300, y: 150 },
          childrenIds: [],
          characterId: 'char_1',
          text: '雨……这座城市的雨从未停歇。',
          choices: [
            { id: 'c1', text: '接听电话' },
            { id: 'c2', text: '忽略它' }
          ]
        } as NarrativeNode
      }
    }
  ]
};

// --- Components ---

// 1. Sidebar Component
const Sidebar = ({ 
  story, 
  selectedIds, 
  onSelect 
}: { 
  story: StoryAsset; 
  selectedIds: string[]; 
  onSelect: (id: string) => void;
}) => {
  const activeSegment = story.segments.find(s => s.id === story.activeSegmentId);

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full select-none">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="font-bold text-zinc-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          Narrative Forge
        </h1>
        <div className="bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded border border-green-800">v0.1</div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-6">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">章节段落</div>
          {story.segments.map(seg => (
            <div 
              key={seg.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer ${story.activeSegmentId === seg.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Box className="w-3 h-3" />
              {seg.name}
            </div>
          ))}
        </div>

        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2 flex justify-between items-center">
            <span>层级结构</span>
            <Plus className="w-3 h-3 cursor-pointer hover:text-white" />
          </div>
          {activeSegment && Object.values(activeSegment.nodes).map(node => (
            <div 
              key={node.id}
              onClick={() => onSelect(node.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer mb-0.5 ${selectedIds.includes(node.id) ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
            >
              {node.type === NodeType.LOCATION ? <ImageIcon className="w-3 h-3" /> : <Type className="w-3 h-3" />}
              {node.name}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800 text-zinc-500 text-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          引擎就绪
        </div>
      </div>
    </div>
  );
};

// 2. Inspector Component
const Inspector = ({ 
  story, 
  selection, 
  onUpdateNode 
}: { 
  story: StoryAsset; 
  selection: string[]; 
  onUpdateNode: (nodeId: string, data: Partial<NarrativeNode>) => void 
}) => {
  const activeSegment = story.segments.find(s => s.id === story.activeSegmentId);
  const selectedNode = selection.length === 1 && activeSegment ? activeSegment.nodes[selection[0]] : null;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiVariations, setAiVariations] = useState<string[]>([]);

  const handleAiGenerate = async () => {
    if (!selectedNode || selectedNode.type !== NodeType.DIALOGUE) return;
    setIsGenerating(true);
    setAiVariations([]);
    
    // Explicitly cast to DialogueNode to fix TS error since union type inference is ambiguous with the base NodeData type
    const dialogueNode = selectedNode as DialogueNode;

    const charName = story.characters.find(c => c.id === dialogueNode.characterId)?.name || "Unknown";
    const variations = await GeminiService.generateDialogueVariations(charName, dialogueNode.text);
    
    setAiVariations(variations);
    setIsGenerating(false);
  };

  if (!selectedNode) {
    return (
      <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col items-center justify-center text-zinc-500">
        <MousePointer2 className="w-12 h-12 mb-4 opacity-20" />
        <p>选择一个对象以查看详情</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-zinc-500 uppercase">{selectedNode.type}</span>
          <MoreVertical className="w-4 h-4 text-zinc-500 cursor-pointer" />
        </div>
        <input 
          type="text" 
          value={selectedNode.name}
          onChange={(e) => onUpdateNode(selectedNode.id, { name: e.target.value })}
          className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1"
        />
      </div>

      <div className="p-4 space-y-6">
        {/* Transform */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase">变换</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">X</label>
              <input 
                type="number" 
                value={selectedNode.position.x}
                onChange={(e) => onUpdateNode(selectedNode.id, { position: { ...selectedNode.position, x: parseInt(e.target.value) || 0 } })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Y</label>
              <input 
                type="number" 
                value={selectedNode.position.y}
                onChange={(e) => onUpdateNode(selectedNode.id, { position: { ...selectedNode.position, y: parseInt(e.target.value) || 0 } })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">W</label>
              <input 
                type="number" 
                value={selectedNode.size.x}
                onChange={(e) => onUpdateNode(selectedNode.id, { size: { ...selectedNode.size, x: parseInt(e.target.value) || 0 } })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">H</label>
              <input 
                type="number" 
                value={selectedNode.size.y}
                onChange={(e) => onUpdateNode(selectedNode.id, { size: { ...selectedNode.size, y: parseInt(e.target.value) || 0 } })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              />
            </div>
          </div>
        </div>

        {/* Specific Properties */}
        {selectedNode.type === NodeType.DIALOGUE && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
               <label className="text-xs font-semibold text-zinc-500 uppercase">对话</label>
               <button 
                onClick={handleAiGenerate}
                disabled={isGenerating}
                className="text-[10px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
               >
                 <Wand2 className="w-3 h-3" />
                 {isGenerating ? '思考中...' : 'AI 助手'}
               </button>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">角色</label>
              <select 
                value={(selectedNode as DialogueNode).characterId}
                onChange={(e) => onUpdateNode(selectedNode.id, { characterId: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300 focus:outline-none"
              >
                {story.characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">文本内容</label>
              <textarea 
                rows={4}
                value={(selectedNode as DialogueNode).text}
                onChange={(e) => onUpdateNode(selectedNode.id, { text: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm text-zinc-300 resize-none focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {aiVariations.length > 0 && (
              <div className="bg-zinc-800/50 p-2 rounded border border-indigo-500/30">
                <span className="text-[10px] text-indigo-400 font-bold block mb-2">Gemini 建议:</span>
                <div className="space-y-2">
                  {aiVariations.map((v, i) => (
                    <div 
                      key={i} 
                      onClick={() => onUpdateNode(selectedNode.id, { text: v })}
                      className="text-xs text-zinc-300 p-2 bg-zinc-800 hover:bg-zinc-700 rounded cursor-pointer border border-zinc-700"
                    >
                      {v}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedNode.type === NodeType.LOCATION && (
          <div className="space-y-3">
             <label className="text-xs font-semibold text-zinc-500 uppercase">场景数据</label>
             <div>
              <label className="text-[10px] text-zinc-500 block mb-1">背景图片 URL</label>
              <div className="flex gap-2">
                 <input 
                  type="text" 
                  value={(selectedNode as any).backgroundImage}
                  readOnly
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-500 truncate"
                />
              </div>
              <div className="mt-2 w-full h-24 bg-zinc-800 rounded overflow-hidden relative group">
                <img src={(selectedNode as any).backgroundImage} className="w-full h-full object-cover opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-zinc-400">预览</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Canvas Component (The Visual Editor)
const Canvas = ({ 
  story, 
  selection, 
  onSelect, 
  onUpdateNode 
}: { 
  story: StoryAsset; 
  selection: string[]; 
  onSelect: (id: string, multi: boolean) => void;
  onUpdateNode: (id: string, data: Partial<NarrativeNode>) => void;
}) => {
  const activeSegment = story.segments.find(s => s.id === story.activeSegmentId);
  const nodes = activeSegment ? Object.values(activeSegment.nodes) : [];

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragState, setDragState] = useState<{ nodeId: string, startX: number, startY: number, initialPos: Vector2 } | null>(null);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Panning handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newScale = Math.min(Math.max(0.1, transform.scale - e.deltaY * zoomSensitivity), 5);
      setTransform(prev => ({ ...prev, scale: newScale }));
    } else {
      // Pan
      setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // If middle mouse or holding space (not implemented here for simplicity), pan
    if (e.button === 1 || e.button === 0 && e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (dragState) {
      const dx = (e.clientX - dragState.startX) / transform.scale;
      const dy = (e.clientY - dragState.startY) / transform.scale;
      onUpdateNode(dragState.nodeId, {
        position: {
          x: Math.round(dragState.initialPos.x + dx),
          y: Math.round(dragState.initialPos.y + dy)
        }
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragState(null);
  };

  // Node Drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: NarrativeNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    onSelect(node.id, e.shiftKey);
    setDragState({
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      initialPos: { ...node.position }
    });
  };

  return (
    <div 
      className="flex-1 bg-[#121212] overflow-hidden relative cursor-crosshair"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
          backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
          backgroundPosition: `${transform.x}px ${transform.y}px`
        }}
      />

      {/* Canvas Content Container */}
      <div 
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
        }}
      >
        {nodes.map(node => (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            className={`absolute border transition-shadow duration-150 group
              ${selection.includes(node.id) ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-xl' : 'border-zinc-700 hover:border-zinc-500'}
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
            {/* Node Header */}
            <div className={`h-6 px-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider
              ${node.type === NodeType.LOCATION ? 'bg-emerald-900/50 text-emerald-400' : 'bg-indigo-900/50 text-indigo-400'}
            `}>
              {node.type === NodeType.LOCATION ? <ImageIcon className="w-3 h-3" /> : <Type className="w-3 h-3" />}
              <span className="truncate">{node.name}</span>
            </div>

            {/* Node Content Preview */}
            <div className="p-3 text-zinc-300 text-xs h-[calc(100%-1.5rem)] overflow-hidden relative">
              {node.type === NodeType.DIALOGUE ? (
                <>
                  <div className="font-bold text-zinc-500 mb-1">
                    {story.characters.find(c => c.id === (node as DialogueNode).characterId)?.name}
                  </div>
                  <div className="italic opacity-80 line-clamp-3">"{(node as DialogueNode).text}"</div>
                  {(node as DialogueNode).choices?.length > 0 && (
                     <div className="mt-2 space-y-1">
                        {(node as DialogueNode).choices.map(c => (
                          <div key={c.id} className="bg-black/20 px-2 py-1 rounded text-[10px] text-indigo-300 border border-indigo-500/20">
                            → {c.text}
                          </div>
                        ))}
                     </div>
                  )}
                </>
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
            
            {/* Selection handle indicators (Visual only for now) */}
            {selection.includes(node.id) && (
              <>
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-indigo-500 rounded-sm" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-indigo-500 rounded-sm" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-indigo-500 rounded-sm" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-indigo-500 rounded-sm" />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 flex items-center p-1 gap-1">
        <button className="p-2 hover:bg-zinc-700 rounded text-white" title="选择 (V)"><MousePointer2 className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-zinc-700 mx-1"></div>
        <button 
           className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
           onClick={() => alert("创建功能将在此处实现")}
        >
          <Type className="w-4 h-4" />
        </button>
        <button className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"><ImageIcon className="w-4 h-4" /></button>
      </div>

      {/* Zoom Controls HUD */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
         <div className="bg-zinc-800 rounded-md shadow-lg border border-zinc-700 flex flex-col p-1">
            <button 
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
              onClick={() => setTransform(prev => ({...prev, scale: Math.min(prev.scale + 0.1, 5)}))}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
              onClick={() => setTransform(prev => ({...prev, scale: Math.max(prev.scale - 0.1, 0.1)}))}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
         </div>
      </div>
    </div>
  );
};

// --- Main App ---

function App() {
  const [story, setStory] = useState<StoryAsset>(INITIAL_STORY);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selection Logic
  const handleSelect = useCallback((id: string, multi: boolean = false) => {
    setSelectedIds(prev => multi ? [...prev, id] : [id]);
  }, []);

  // Update Logic (Immutably update the deep nested state)
  const handleUpdateNode = useCallback((nodeId: string, data: Partial<NarrativeNode>) => {
    setStory(prevStory => {
      const activeSeg = prevStory.segments.find(s => s.id === prevStory.activeSegmentId);
      if (!activeSeg) return prevStory;

      const updatedSeg = {
        ...activeSeg,
        nodes: {
          ...activeSeg.nodes,
          [nodeId]: { ...activeSeg.nodes[nodeId], ...data }
        }
      };

      return {
        ...prevStory,
        segments: prevStory.segments.map(s => s.id === s.id ? updatedSeg : s)
      };
    });
  }, []);

  return (
    <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      <Sidebar 
        story={story} 
        selectedIds={selectedIds} 
        onSelect={(id) => handleSelect(id)}
      />
      
      <div className="flex-1 flex flex-col h-full relative">
        <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-4">
             <span className="font-semibold text-sm">{story.title}</span>
             <span className="text-zinc-600">/</span>
             <span className="text-zinc-400 text-sm">第一章</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded transition-colors text-zinc-300">
              <Play className="w-3 h-3 fill-current" /> 预览
            </button>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-1.5 rounded transition-colors font-semibold">
              <Save className="w-3 h-3" /> 保存
            </button>
          </div>
        </header>

        <Canvas 
          story={story} 
          selection={selectedIds} 
          onSelect={handleSelect}
          onUpdateNode={handleUpdateNode}
        />
      </div>

      <Inspector 
        story={story} 
        selection={selectedIds} 
        onUpdateNode={handleUpdateNode}
      />
    </div>
  );
}

export default App;