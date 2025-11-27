import React, { useState } from 'react';
import { MousePointer2, MoreVertical, Wand2 } from 'lucide-react';
import { NodeType, DialogueNode } from '../types';
import * as GeminiService from '../services/geminiService';
import { useEditorStore } from '../store/useEditorStore';

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  [NodeType.DIALOGUE]: '对话',
  [NodeType.LOCATION]: '场景',
  [NodeType.BRANCH]: '分支',
  [NodeType.JUMP]: '跳转',
};

const Inspector: React.FC = () => {
  const { story, selectedIds, updateNode } = useEditorStore();
  
  const activeSegment = story.segments.find(s => s.id === story.activeSegmentId);
  const selectedNode = selectedIds.length === 1 && activeSegment ? activeSegment.nodes[selectedIds[0]] : null;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiVariations, setAiVariations] = useState<string[]>([]);

  const handleAiGenerate = async () => {
    if (!selectedNode || selectedNode.type !== NodeType.DIALOGUE) return;
    setIsGenerating(true);
    setAiVariations([]);
    
    // Explicitly cast to DialogueNode
    const dialogueNode = selectedNode as DialogueNode;

    const charName = story.characters.find(c => c.id === dialogueNode.characterId)?.name || "未知角色";
    const variations = await GeminiService.generateDialogueVariations(charName, dialogueNode.text);
    
    setAiVariations(variations);
    setIsGenerating(false);
  };

  if (!selectedNode) {
    return (
      <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col items-center justify-center text-zinc-500 z-10">
        <MousePointer2 className="w-12 h-12 mb-4 opacity-20" />
        <p>选择一个对象以查看详情</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col overflow-y-auto z-10">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-zinc-500 uppercase">{NODE_TYPE_LABELS[selectedNode.type] || selectedNode.type}</span>
          <MoreVertical className="w-4 h-4 text-zinc-500 cursor-pointer" />
        </div>
        <input 
          type="text" 
          value={selectedNode.name}
          onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
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
                onChange={(e) => updateNode(selectedNode.id, { position: { ...selectedNode.position, x: parseInt(e.target.value) || 0 } })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Y</label>
              <input 
                type="number" 
                value={selectedNode.position.y}
                onChange={(e) => updateNode(selectedNode.id, { position: { ...selectedNode.position, y: parseInt(e.target.value) || 0 } })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">W</label>
              <input 
                type="number" 
                value={selectedNode.size.x}
                onChange={(e) => updateNode(selectedNode.id, { size: { ...selectedNode.size, x: parseInt(e.target.value) || 0 } })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">H</label>
              <input 
                type="number" 
                value={selectedNode.size.y}
                onChange={(e) => updateNode(selectedNode.id, { size: { ...selectedNode.size, y: parseInt(e.target.value) || 0 } })}
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
                onChange={(e) => updateNode(selectedNode.id, { characterId: e.target.value })}
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
                onChange={(e) => updateNode(selectedNode.id, { text: e.target.value })}
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
                      onClick={() => updateNode(selectedNode.id, { text: v })}
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

export default Inspector;
