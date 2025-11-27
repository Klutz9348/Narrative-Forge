import React, { useState } from 'react';
import { MousePointer2, MoreVertical, Wand2, Plus, Trash2, ArrowRightCircle } from 'lucide-react';
import { NodeType, DialogueNode, BranchNode, VariableSetterNode, JumpNode } from '../types';
import * as GeminiService from '../services/geminiService';
import { useEditorStore } from '../store/useEditorStore';

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  [NodeType.DIALOGUE]: '对话 (Dialogue)',
  [NodeType.LOCATION]: '场景 (Location)',
  [NodeType.BRANCH]: '逻辑分支 (Branch)',
  [NodeType.JUMP]: '章节跳转 (Jump)',
  [NodeType.SET_VARIABLE]: '设置变量 (Set Var)',
};

const Inspector: React.FC = () => {
  const { story, selectedIds, updateNode, startEditing, commitEditing } = useEditorStore();
  
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

  // --- Helper Functions for Branch Node ---
  const addCondition = () => {
    if (!selectedNode || selectedNode.type !== NodeType.BRANCH) return;
    const node = selectedNode as BranchNode;
    startEditing(node.id);
    const newConditions = [
      ...(node.conditions || []),
      { id: `cond_${Date.now()}`, expression: 'true' }
    ];
    updateNode(node.id, { conditions: newConditions });
    commitEditing();
  };

  const removeCondition = (conditionId: string) => {
    if (!selectedNode || selectedNode.type !== NodeType.BRANCH) return;
    const node = selectedNode as BranchNode;
    startEditing(node.id);
    const newConditions = node.conditions.filter(c => c.id !== conditionId);
    updateNode(node.id, { conditions: newConditions });
    commitEditing();
  };

  const updateCondition = (conditionId: string, expression: string) => {
    if (!selectedNode || selectedNode.type !== NodeType.BRANCH) return;
    const node = selectedNode as BranchNode;
    const newConditions = node.conditions.map(c => 
      c.id === conditionId ? { ...c, expression } : c
    );
    updateNode(node.id, { conditions: newConditions });
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
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col overflow-y-auto z-10 custom-scrollbar">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-zinc-500 uppercase">{NODE_TYPE_LABELS[selectedNode.type] || selectedNode.type}</span>
          <MoreVertical className="w-4 h-4 text-zinc-500 cursor-pointer" />
        </div>
        <input 
          type="text" 
          value={selectedNode.name}
          onFocus={() => startEditing(selectedNode.id)}
          onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
          onBlur={commitEditing}
          className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1"
        />
        <div className="text-[10px] text-zinc-600 font-mono mt-1">ID: {selectedNode.id}</div>
      </div>

      <div className="p-4 space-y-6">
        {/* Transform (Common for all nodes) */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase">变换 (Transform)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">X</label>
              <input 
                type="number" 
                value={selectedNode.position.x}
                onFocus={() => startEditing(selectedNode.id)}
                onChange={(e) => updateNode(selectedNode.id, { position: { ...selectedNode.position, x: parseInt(e.target.value) || 0 } })}
                onBlur={commitEditing}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Y</label>
              <input 
                type="number" 
                value={selectedNode.position.y}
                onFocus={() => startEditing(selectedNode.id)}
                onChange={(e) => updateNode(selectedNode.id, { position: { ...selectedNode.position, y: parseInt(e.target.value) || 0 } })}
                onBlur={commitEditing}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              />
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-zinc-800" />

        {/* --- Specific Properties based on Type --- */}

        {/* 1. DIALOGUE NODE */}
        {selectedNode.type === NodeType.DIALOGUE && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
               <label className="text-xs font-semibold text-zinc-500 uppercase">对话内容</label>
               <button 
                onClick={handleAiGenerate}
                disabled={isGenerating}
                className="text-[10px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
               >
                 <Wand2 className="w-3 h-3" />
                 {isGenerating ? 'AI 生成中...' : 'AI 润色'}
               </button>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">角色</label>
              <select 
                value={(selectedNode as DialogueNode).characterId}
                onChange={(e) => {
                  startEditing(selectedNode.id);
                  updateNode(selectedNode.id, { characterId: e.target.value });
                  commitEditing();
                }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300 focus:outline-none"
              >
                {story.characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">台词</label>
              <textarea 
                rows={5}
                value={(selectedNode as DialogueNode).text}
                onFocus={() => startEditing(selectedNode.id)}
                onChange={(e) => updateNode(selectedNode.id, { text: e.target.value })}
                onBlur={commitEditing}
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
                      onClick={() => {
                        startEditing(selectedNode.id);
                        updateNode(selectedNode.id, { text: v });
                        commitEditing();
                      }}
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

        {/* 2. BRANCH NODE */}
        {selectedNode.type === NodeType.BRANCH && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
               <label className="text-xs font-semibold text-zinc-500 uppercase">分支条件 (Conditions)</label>
               <button 
                 onClick={addCondition}
                 className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                 title="添加条件"
               >
                 <Plus className="w-3 h-3" />
               </button>
            </div>
            
            <div className="space-y-2">
              {(selectedNode as BranchNode).conditions?.map((condition, idx) => (
                <div key={condition.id} className="flex gap-2 items-center">
                  <div className="text-[10px] text-zinc-500 w-4 font-mono">{idx + 1}</div>
                  <input
                    type="text"
                    value={condition.expression}
                    onFocus={() => startEditing(selectedNode.id)}
                    onChange={(e) => updateCondition(condition.id, e.target.value)}
                    onBlur={commitEditing}
                    placeholder="例如: coin >= 5"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
                  />
                  <button 
                    onClick={() => removeCondition(condition.id)}
                    className="text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(!(selectedNode as BranchNode).conditions || (selectedNode as BranchNode).conditions.length === 0) && (
                 <div className="text-xs text-zinc-600 italic text-center py-2">无条件，请点击 + 添加</div>
              )}
            </div>
            
            <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-800">
              提示：每行条件将在画布上生成一个输出连接点。
            </div>
          </div>
        )}

        {/* 3. SET VARIABLE NODE */}
        {selectedNode.type === NodeType.SET_VARIABLE && (
           <div className="space-y-3">
             <label className="text-xs font-semibold text-zinc-500 uppercase">变量操作</label>
             
             <div>
               <label className="text-[10px] text-zinc-500 block mb-1">变量名</label>
               <input 
                 type="text" 
                 value={(selectedNode as VariableSetterNode).variableName || ''}
                 onFocus={() => startEditing(selectedNode.id)}
                 onChange={(e) => {
                    updateNode(selectedNode.id, { variableName: e.target.value });
                 }}
                 onBlur={commitEditing}
                 placeholder="例如: has_key"
                 className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300 font-mono"
               />
             </div>

             <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">操作符</label>
                  <select
                    value={(selectedNode as VariableSetterNode).operator || 'SET'}
                    onChange={(e) => {
                      startEditing(selectedNode.id);
                      updateNode(selectedNode.id, { operator: e.target.value as any });
                      commitEditing();
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
                  >
                    <option value="SET">赋值 (=)</option>
                    <option value="ADD">增加 (+)</option>
                    <option value="SUB">减少 (-)</option>
                  </select>
                </div>
                <div>
                   <label className="text-[10px] text-zinc-500 block mb-1">值</label>
                   <input 
                     type="text" 
                     value={(selectedNode as VariableSetterNode).value || ''}
                     onFocus={() => startEditing(selectedNode.id)}
                     onChange={(e) => updateNode(selectedNode.id, { value: e.target.value })}
                     onBlur={commitEditing}
                     placeholder="true / 10"
                     className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300 font-mono"
                   />
                </div>
             </div>
           </div>
        )}

        {/* 4. JUMP NODE */}
        {selectedNode.type === NodeType.JUMP && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-500 uppercase">跳转目标</label>
            <div className="p-2 bg-indigo-900/20 border border-indigo-500/30 rounded flex items-start gap-2">
               <ArrowRightCircle className="w-4 h-4 text-indigo-400 mt-0.5" />
               <div className="text-xs text-indigo-200">
                 此节点将结束当前章节，并加载所选的目标章节。
               </div>
            </div>
            
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">目标章节</label>
              <select
                 value={(selectedNode as JumpNode).targetSegmentId || ''}
                 onChange={(e) => {
                   startEditing(selectedNode.id);
                   updateNode(selectedNode.id, { targetSegmentId: e.target.value });
                   commitEditing();
                 }}
                 className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
              >
                <option value="">-- 选择章节 --</option>
                {story.segments.map(seg => (
                  <option key={seg.id} value={seg.id}>{seg.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 5. LOCATION NODE */}
        {selectedNode.type === NodeType.LOCATION && (
          <div className="space-y-3">
             <label className="text-xs font-semibold text-zinc-500 uppercase">场景数据</label>
             <div>
              <label className="text-[10px] text-zinc-500 block mb-1">背景图片 URL</label>
              <input 
                  type="text" 
                  value={(selectedNode as any).backgroundImage}
                  onFocus={() => startEditing(selectedNode.id)}
                  onChange={(e) => updateNode(selectedNode.id, { backgroundImage: e.target.value })}
                  onBlur={commitEditing}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-500 truncate"
              />
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