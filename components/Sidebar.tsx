import React from 'react';
import { Layers, Box, Plus, Type, Image as ImageIcon } from 'lucide-react';
import { NodeType, NarrativeNode } from '../types';
import { useEditorStore } from '../store/useEditorStore';

const Sidebar: React.FC = () => {
  const { story, selectedIds, selectNode } = useEditorStore();
  const activeSegment = story.segments.find(s => s.id === story.activeSegmentId);

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full select-none z-10">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="font-bold text-zinc-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          叙事工坊
        </h1>
        <div className="bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded border border-green-800">v0.2</div>
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
          {activeSegment && (Object.values(activeSegment.nodes) as NarrativeNode[]).map(node => (
            <div 
              key={node.id}
              onClick={() => selectNode(node.id)}
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
          系统状态：在线
        </div>
      </div>
    </div>
  );
};

export default Sidebar;