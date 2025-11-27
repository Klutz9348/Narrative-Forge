
import React, { useState } from 'react';
import { MousePointer2, MoreVertical, Wand2, Plus, Trash2, ArrowRightCircle, Mic, Music, LayoutTemplate, Settings2, Code, Split, Zap, PlayCircle, StopCircle, Target, Clapperboard, Timer, Smartphone, MessageSquare, ImageIcon } from 'lucide-react';
import { NodeType, DialogueNode, BranchNode, VariableSetterNode, JumpNode, LocationNode, NodeEvent, Hotspot, ActionNode, ActionCommandType } from '../types';
import * as GeminiService from '../services/geminiService';
import { useEditorStore } from '../store/useEditorStore';

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  [NodeType.DIALOGUE]: '对话 (Dialogue)',
  [NodeType.LOCATION]: '场景 (Location)',
  [NodeType.BRANCH]: '逻辑分支 (Branch)',
  [NodeType.JUMP]: '章节跳转 (Jump)',
  [NodeType.SET_VARIABLE]: '设置变量 (Set Var)',
  [NodeType.ACTION]: '动作序列 (Action Script)',
};

// Definition of available add-ons per node type
const ADDON_DEFINITIONS: Record<NodeType, { key: string; label: string; icon: React.ReactNode; defaultValue: any }[]> = {
  [NodeType.DIALOGUE]: [
    { key: 'voiceId', label: '语音 (Voiceover)', icon: <Mic className="w-3 h-3"/>, defaultValue: '' },
    { key: 'expression', label: '表情 (Expression)', icon: <Settings2 className="w-3 h-3"/>, defaultValue: 'neutral' },
    { key: 'placement', label: '站位 (Placement)', icon: <LayoutTemplate className="w-3 h-3"/>, defaultValue: 'center' }
  ],
  [NodeType.LOCATION]: [
    { key: 'bgm', label: '背景音乐 (BGM)', icon: <Music className="w-3 h-3"/>, defaultValue: '' },
    { key: 'filter', label: '视觉滤镜 (Filter)', icon: <Settings2 className="w-3 h-3"/>, defaultValue: 'none' }
  ],
  [NodeType.BRANCH]: [
    { key: 'defaultNextNodeId', label: '默认路径 (Else Path)', icon: <Split className="w-3 h-3"/>, defaultValue: '' }
  ],
  [NodeType.SET_VARIABLE]: [
    { key: 'isAdvanced', label: '高级模式 (Advanced)', icon: <Code className="w-3 h-3"/>, defaultValue: true }
  ],
  [NodeType.JUMP]: [],
  [NodeType.ACTION]: []
};

// Command Definitions for Action Node
const ACTION_COMMANDS: Record<ActionCommandType, { label: string; icon: React.ReactNode; params: { key: string; label: string; type: 'text' | 'number' }[] }> = {
  playSound: { 
    label: '播放音效', 
    icon: <Zap className="w-3 h-3" />,
    params: [{ key: 'audioId', label: 'Audio ID / URL', type: 'text' }] 
  },
  wait: { 
    label: '等待 (Wait)', 
    icon: <Timer className="w-3 h-3" />,
    params: [{ key: 'duration', label: 'Duration (sec)', type: 'number' }] 
  },
  screenShake: { 
    label: '屏幕震动', 
    icon: <Smartphone className="w-3 h-3" />,
    params: [
      { key: 'intensity', label: 'Intensity (1-10)', type: 'number' },
      { key: 'duration', label: 'Duration (sec)', type: 'number' }
    ] 
  },
  showToast: { 
    label: '显示提示', 
    icon: <MessageSquare className="w-3 h-3" />,
    params: [{ key: 'message', label: 'Message', type: 'text' }] 
  }
};

const Inspector: React.FC = () => {
  const { story, selectedIds, updateNode, startEditing, commitEditing } = useEditorStore();
  
  const activeSegment = story.segments.find(s => s.id === story.activeSegmentId);
  const selectedNode = selectedIds.length === 1 && activeSegment ? activeSegment.nodes[selectedIds[0]] : null;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiVariations, setAiVariations] = useState<string[]>([]);
  const [showAddonMenu, setShowAddonMenu] = useState(false);
  const [showEventMenu, setShowEventMenu] = useState(false);

  const handleAiGenerate = async () => {
    if (!selectedNode || selectedNode.type !== NodeType.DIALOGUE) return;
    setIsGenerating(true);
    setAiVariations([]);
    
    const dialogueNode = selectedNode as DialogueNode;
    const charName = story.characters.find(c => c.id === dialogueNode.characterId)?.name || "未知角色";
    const variations = await GeminiService.generateDialogueVariations(charName, dialogueNode.text);
    
    setAiVariations(variations);
    setIsGenerating(false);
  };

  // Helper: Enable an add-on module
  const enableAddon = (key: string, defaultValue: any) => {
    if (!selectedNode) return;
    startEditing(selectedNode.id);
    updateNode(selectedNode.id, { [key]: defaultValue });
    commitEditing();
    setShowAddonMenu(false);
  };

  // Helper: Disable/Remove an add-on module
  const removeAddon = (key: string) => {
    if (!selectedNode) return;
    startEditing(selectedNode.id);
    updateNode(selectedNode.id, { [key]: undefined });
    commitEditing();
  };

  // Location Node Specific Helpers
  const addHotspot = () => {
    if (!selectedNode || selectedNode.type !== NodeType.LOCATION) return;
    const locNode = selectedNode as LocationNode;
    const newHotspot: Hotspot = {
      id: `hs_${Date.now()}`,
      name: `Hotspot ${((locNode.hotspots?.length || 0) + 1)}`,
      rect: { x: 20, y: 20, w: 20, h: 20 } // Default 20% box
    };
    startEditing(locNode.id);
    updateNode(locNode.id, { hotspots: [...(locNode.hotspots || []), newHotspot] });
    commitEditing();
  };

  const removeHotspot = (hsId: string) => {
    if (!selectedNode || selectedNode.type !== NodeType.LOCATION) return;
    const locNode = selectedNode as LocationNode;
    startEditing(locNode.id);
    // Remove hotspot AND any events linked to it
    const newEvents = (locNode.events || []).filter(e => e.targetId !== hsId);
    const newHotspots = (locNode.hotspots || []).filter(h => h.id !== hsId);
    updateNode(locNode.id, { hotspots: newHotspots, events: newEvents });
    commitEditing();
  };

  const addEvent = (trigger: 'onEnter' | 'onExit' | 'onClick', targetId?: string) => {
    if (!selectedNode || selectedNode.type !== NodeType.LOCATION) return;
    const locNode = selectedNode as LocationNode;
    
    let label: string = trigger;
    if (trigger === 'onClick' && targetId) {
      const hs = locNode.hotspots?.find(h => h.id === targetId);
      label = `Click: ${hs?.name || 'Unknown'}`;
    } else if (trigger === 'onEnter') {
      label = '进入时 (On Enter)';
    } else if (trigger === 'onExit') {
      label = '离开时 (On Exit)';
    }

    const newEvent: NodeEvent = {
      id: `evt_${Date.now()}`,
      type: trigger === 'onClick' ? 'interaction' : 'lifecycle',
      trigger,
      targetId,
      label
    };

    startEditing(locNode.id);
    updateNode(locNode.id, { events: [...(locNode.events || []), newEvent] });
    commitEditing();
    setShowEventMenu(false); // Close menu after adding
  };

  const addActionCommand = (type: ActionCommandType) => {
    if (!selectedNode || selectedNode.type !== NodeType.ACTION) return;
    const actionNode = selectedNode as ActionNode;
    
    const newCommand = {
      id: `cmd_${Date.now()}`,
      type,
      params: {}
    };
    
    startEditing(actionNode.id);
    updateNode(actionNode.id, { commands: [...(actionNode.commands || []), newCommand] });
    commitEditing();
  };

  if (!selectedNode) {
    return (
      <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col items-center justify-center text-zinc-500 z-10">
        <MousePointer2 className="w-12 h-12 mb-4 opacity-20" />
        <p>选择一个对象以查看详情</p>
      </div>
    );
  }

  // Determine available addons that are NOT yet enabled
  const availableAddons = ADDON_DEFINITIONS[selectedNode.type]?.filter(addon => (selectedNode as any)[addon.key] === undefined) || [];

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 h-full flex flex-col z-10">
      
      {/* 1. HEADER (Always Visible) */}
      <div className="p-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-zinc-500 uppercase">{NODE_TYPE_LABELS[selectedNode.type] || selectedNode.type}</span>
          <div className="text-[10px] text-zinc-600 font-mono">ID: {selectedNode.id.slice(-6)}</div>
        </div>
        <input 
          type="text" 
          value={selectedNode.name}
          onFocus={() => startEditing(selectedNode.id)}
          onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
          onBlur={commitEditing}
          className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1"
        />
        
        {/* Transform Info */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
             <span className="text-[10px] text-zinc-500 uppercase">X</span>
             <input 
                type="number" 
                value={selectedNode.position.x}
                onFocus={() => startEditing(selectedNode.id)}
                onChange={(e) => updateNode(selectedNode.id, { position: { ...selectedNode.position, x: parseInt(e.target.value) || 0 } })}
                onBlur={commitEditing}
                className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-300 font-mono text-right"
              />
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] text-zinc-500 uppercase">Y</span>
             <input 
                type="number" 
                value={selectedNode.position.y}
                onFocus={() => startEditing(selectedNode.id)}
                onChange={(e) => updateNode(selectedNode.id, { position: { ...selectedNode.position, y: parseInt(e.target.value) || 0 } })}
                onBlur={commitEditing}
                className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-300 font-mono text-right"
              />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {/* 2. CORE PAYLOAD (Minimal Set) */}
        
        {selectedNode.type === NodeType.DIALOGUE && (
          <div className="space-y-4">
             <div>
              <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">角色 (Character)</label>
              <select 
                value={(selectedNode as DialogueNode).characterId}
                onChange={(e) => {
                  startEditing(selectedNode.id);
                  updateNode(selectedNode.id, { characterId: e.target.value });
                  commitEditing();
                }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 focus:outline-none"
              >
                {story.characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                 <label className="text-[10px] text-zinc-500 uppercase font-semibold">台词 (Line)</label>
                 <button 
                  onClick={handleAiGenerate}
                  disabled={isGenerating}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
                 >
                   <Wand2 className="w-3 h-3" />
                   AI 润色
                 </button>
              </div>
              <textarea 
                rows={4}
                value={(selectedNode as DialogueNode).text}
                onFocus={() => startEditing(selectedNode.id)}
                onChange={(e) => updateNode(selectedNode.id, { text: e.target.value })}
                onBlur={commitEditing}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm text-zinc-300 resize-none focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              
              {/* AI Variations Dropdown */}
              {aiVariations.length > 0 && (
                <div className="mt-2 bg-zinc-800/50 p-2 rounded border border-indigo-500/30">
                  <span className="text-[10px] text-indigo-400 font-bold block mb-2">建议:</span>
                  <div className="space-y-1">
                    {aiVariations.map((v, i) => (
                      <button 
                        key={i} 
                        onClick={() => {
                          startEditing(selectedNode.id);
                          updateNode(selectedNode.id, { text: v });
                          commitEditing();
                          setAiVariations([]); // Clear after selection
                        }}
                        className="text-xs text-left w-full text-zinc-300 p-1.5 hover:bg-zinc-700 rounded border border-transparent hover:border-zinc-600 transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
               <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">选项 (Choices)</label>
                  <button 
                    onClick={() => {
                      const node = selectedNode as DialogueNode;
                      startEditing(node.id);
                      const newId = `c_${Date.now()}`;
                      updateNode(node.id, { choices: [...(node.choices || []), { id: newId, text: '新选项' }] });
                      commitEditing();
                    }}
                    className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="添加选项"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
               </div>
               
               <div className="space-y-2">
                 {(selectedNode as DialogueNode).choices?.map((c, i) => (
                    <div key={c.id} className="flex gap-2 items-center group">
                       <input 
                         className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                         value={c.text} 
                         onFocus={() => startEditing(selectedNode.id)}
                         onChange={(e) => {
                            const node = selectedNode as DialogueNode;
                            const newChoices = [...node.choices];
                            newChoices[i] = { ...c, text: e.target.value };
                            updateNode(node.id, { choices: newChoices });
                         }}
                         onBlur={commitEditing}
                         placeholder="选项文本..."
                       />
                       <button 
                          onClick={() => {
                            const node = selectedNode as DialogueNode;
                            startEditing(node.id);
                            const newChoices = node.choices.filter(choice => choice.id !== c.id);
                            updateNode(node.id, { choices: newChoices });
                            commitEditing();
                          }}
                          className="p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="删除选项"
                       >
                          <Trash2 className="w-3 h-3" />
                       </button>
                    </div>
                 ))}
                 
                 {(!((selectedNode as DialogueNode).choices?.length)) && (
                    <div className="text-[10px] text-zinc-600 italic border border-dashed border-zinc-800 p-3 rounded text-center">
                       暂无选项
                       <div className="mt-1 text-zinc-700">将使用默认输出端口连接下一节点。</div>
                    </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {selectedNode.type === NodeType.LOCATION && (
          <div className="space-y-4">
             <div>
              <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">背景图 (Image)</label>
              <input 
                  type="text" 
                  value={(selectedNode as LocationNode).backgroundImage}
                  onFocus={() => startEditing(selectedNode.id)}
                  onChange={(e) => updateNode(selectedNode.id, { backgroundImage: e.target.value })}
                  onBlur={commitEditing}
                  placeholder="Image URL..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-500 truncate mb-2"
              />
              <div className="w-full aspect-video bg-zinc-900 rounded border border-zinc-800 overflow-hidden relative group">
                {(selectedNode as LocationNode).backgroundImage ? (
                  <img src={(selectedNode as LocationNode).backgroundImage} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs">No Image</div>
                )}
              </div>
            </div>

            {/* Hotspot Manager */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">热区 (Hotspots)</label>
                  <button onClick={addHotspot} className="text-zinc-500 hover:text-white"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2">
                {(selectedNode as LocationNode).hotspots?.map(hs => (
                  <div key={hs.id} className="bg-zinc-800/50 p-2 rounded border border-zinc-700 group">
                    <div className="flex justify-between items-center mb-1">
                      <input 
                        value={hs.name}
                        onChange={(e) => {
                          const node = selectedNode as LocationNode;
                          startEditing(node.id);
                          const newHotspots = node.hotspots.map(h => h.id === hs.id ? { ...h, name: e.target.value } : h);
                          updateNode(node.id, { hotspots: newHotspots });
                        }}
                        onBlur={commitEditing}
                        className="bg-transparent text-xs text-zinc-300 focus:outline-none w-24"
                      />
                      <button onClick={() => removeHotspot(hs.id)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    {/* Position & Size */}
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {(['x', 'y', 'w', 'h'] as const).map(prop => (
                         <div key={prop} className="flex items-center gap-1">
                           <span className="text-[8px] text-zinc-600 uppercase">{prop}</span>
                           <input 
                             type="number"
                             value={hs.rect[prop]}
                             onChange={(e) => {
                                const node = selectedNode as LocationNode;
                                startEditing(node.id);
                                const newHotspots = node.hotspots.map(h => h.id === hs.id ? { ...h, rect: { ...h.rect, [prop]: parseInt(e.target.value) || 0 } } : h);
                                updateNode(node.id, { hotspots: newHotspots });
                             }}
                             onBlur={commitEditing}
                             className="w-full bg-zinc-900 border border-zinc-700 rounded px-1 text-[10px] text-zinc-400"
                           />
                         </div>
                      ))}
                    </div>
                    {/* Hotspot Image URL */}
                     <div className="flex items-center gap-2">
                       <ImageIcon className="w-3 h-3 text-zinc-600 shrink-0" />
                       <input 
                         type="text"
                         value={hs.image || ''}
                         placeholder="Image URL (Optional)"
                         onChange={(e) => {
                            const node = selectedNode as LocationNode;
                            startEditing(node.id);
                            const newHotspots = node.hotspots.map(h => h.id === hs.id ? { ...h, image: e.target.value } : h);
                            updateNode(node.id, { hotspots: newHotspots });
                         }}
                         onBlur={commitEditing}
                         className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-400"
                       />
                     </div>
                  </div>
                ))}
                {!((selectedNode as LocationNode).hotspots?.length) && (
                  <div className="text-[10px] text-zinc-600 italic text-center p-2 border border-dashed border-zinc-800 rounded">No Hotspots Defined</div>
                )}
              </div>
            </div>

            {/* Event Manager */}
            <div>
               <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">事件与动态端口 (Events)</label>
                  <div className="relative">
                    <button 
                      onClick={() => setShowEventMenu(!showEventMenu)}
                      className={`text-zinc-500 hover:text-white transition-colors ${showEventMenu ? 'text-white' : ''}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    
                    {showEventMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowEventMenu(false)}></div>
                        <div className="absolute right-0 top-full mt-1 w-32 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                          <button onClick={() => addEvent('onEnter')} className="w-full text-left px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 transition-colors"><PlayCircle className="w-3 h-3 text-green-400" /> On Enter</button>
                          <button onClick={() => addEvent('onExit')} className="w-full text-left px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 transition-colors"><StopCircle className="w-3 h-3 text-red-400" /> On Exit</button>
                          <div className="border-t border-zinc-700 my-1"></div>
                          {(selectedNode as LocationNode).hotspots?.map(hs => (
                            <button key={hs.id} onClick={() => addEvent('onClick', hs.id)} className="w-full text-left px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 transition-colors"><Target className="w-3 h-3 text-amber-400" /> Click: {hs.name}</button>
                          ))}
                          {(!((selectedNode as LocationNode).hotspots?.length)) && (
                             <div className="px-2 py-1 text-[10px] text-zinc-500 italic text-center">No Hotspots</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
               </div>
               
               <div className="space-y-1.5">
                  {(selectedNode as LocationNode).events?.map(evt => (
                    <div key={evt.id} className="flex items-center justify-between p-1.5 bg-zinc-800 rounded border border-zinc-700 text-xs">
                       <div className="flex items-center gap-2">
                          <Zap className={`w-3 h-3 ${evt.trigger === 'onClick' ? 'text-amber-400' : 'text-indigo-400'}`} />
                          <span className="text-zinc-300">{evt.label}</span>
                       </div>
                       <button 
                         onClick={() => {
                            const node = selectedNode as LocationNode;
                            startEditing(node.id);
                            updateNode(node.id, { events: node.events.filter(e => e.id !== evt.id) });
                            commitEditing();
                         }}
                         className="text-zinc-600 hover:text-red-400"
                       >
                         <Trash2 className="w-3 h-3" />
                       </button>
                    </div>
                  ))}
                  {!((selectedNode as LocationNode).events?.length) && (
                     <div className="text-[10px] text-zinc-600 italic text-center p-2 border border-dashed border-zinc-800 rounded">
                       默认：单输出端口
                     </div>
                  )}
               </div>
            </div>

          </div>
        )}

        {selectedNode.type === NodeType.BRANCH && (
           <div className="space-y-4">
              <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">条件列表 (Conditions)</label>
              <div className="space-y-2">
                {(selectedNode as BranchNode).conditions?.map((condition, idx) => (
                  <div key={condition.id} className="flex gap-2 items-center group">
                    <div className="text-[10px] text-zinc-500 w-4 font-mono text-center">{idx + 1}</div>
                    <input
                      type="text"
                      value={condition.expression}
                      onFocus={() => startEditing(selectedNode.id)}
                      onChange={(e) => {
                         const node = selectedNode as BranchNode;
                         const newConditions = node.conditions.map(c => c.id === condition.id ? { ...c, expression: e.target.value } : c);
                         updateNode(node.id, { conditions: newConditions });
                      }}
                      onBlur={commitEditing}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
                    />
                    <button 
                      onClick={() => {
                        const node = selectedNode as BranchNode;
                        startEditing(node.id);
                        updateNode(node.id, { conditions: node.conditions.filter(c => c.id !== condition.id) });
                        commitEditing();
                      }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={() => {
                    const node = selectedNode as BranchNode;
                    startEditing(node.id);
                    updateNode(node.id, { conditions: [...(node.conditions || []), { id: `c_${Date.now()}`, expression: 'true' }] });
                    commitEditing();
                  }}
                  className="w-full py-1.5 border border-dashed border-zinc-700 hover:border-zinc-500 rounded text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 添加条件
                </button>
              </div>
           </div>
        )}

        {selectedNode.type === NodeType.SET_VARIABLE && (
          <div className="space-y-4">
             <div>
               <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">变量名 (Variable Name)</label>
               <input 
                 type="text" 
                 value={(selectedNode as VariableSetterNode).variableName || ''}
                 onFocus={() => startEditing(selectedNode.id)}
                 onChange={(e) => updateNode(selectedNode.id, { variableName: e.target.value })}
                 onBlur={commitEditing}
                 className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 font-mono"
               />
             </div>

             {/* Simple Mode UI (Hidden if Advanced Module is active) */}
             {!(selectedNode as VariableSetterNode).isAdvanced && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">操作 (Op)</label>
                      <select
                        value={(selectedNode as VariableSetterNode).operator || 'SET'}
                        onChange={(e) => {
                          startEditing(selectedNode.id);
                          updateNode(selectedNode.id, { operator: e.target.value as any });
                          commitEditing();
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300"
                      >
                        <option value="SET">赋值 (=)</option>
                        <option value="ADD">增加 (+)</option>
                        <option value="SUB">减少 (-)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">值 (Value)</label>
                      <input 
                        type="text" 
                        value={(selectedNode as VariableSetterNode).value || ''}
                        onFocus={() => startEditing(selectedNode.id)}
                        onChange={(e) => updateNode(selectedNode.id, { value: e.target.value })}
                        onBlur={commitEditing}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 font-mono"
                      />
                    </div>
                </div>
             )}
          </div>
        )}

        {selectedNode.type === NodeType.JUMP && (
           <div className="space-y-4">
             <div className="p-2 bg-indigo-900/20 border border-indigo-500/30 rounded flex items-start gap-2">
               <ArrowRightCircle className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
               <div className="text-xs text-indigo-200">
                 结束当前章节，跳转至下一章。
               </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">目标章节 (Target)</label>
              <select
                 value={(selectedNode as JumpNode).targetSegmentId || ''}
                 onChange={(e) => {
                   startEditing(selectedNode.id);
                   updateNode(selectedNode.id, { targetSegmentId: e.target.value });
                   commitEditing();
                 }}
                 className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300"
              >
                <option value="">-- 选择章节 --</option>
                {story.segments.map(seg => (
                  <option key={seg.id} value={seg.id}>{seg.name}</option>
                ))}
              </select>
            </div>
           </div>
        )}
        
        {/* Action Node Editor */}
        {selectedNode.type === NodeType.ACTION && (
           <div className="space-y-4">
              <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">指令序列 (Command Sequence)</label>
              
              <div className="flex gap-2 flex-wrap mb-4">
                 {(Object.keys(ACTION_COMMANDS) as ActionCommandType[]).map(type => (
                    <button 
                      key={type}
                      onClick={() => addActionCommand(type)}
                      className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] text-zinc-300 transition-colors"
                    >
                      {ACTION_COMMANDS[type].icon}
                      {ACTION_COMMANDS[type].label}
                    </button>
                 ))}
              </div>

              <div className="space-y-3">
                 {(selectedNode as ActionNode).commands?.map((cmd, idx) => {
                    const def = ACTION_COMMANDS[cmd.type];
                    return (
                      <div key={cmd.id} className="bg-zinc-800/50 border border-zinc-700 rounded p-2 relative group">
                         <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-700/50">
                            <span className="text-[10px] font-mono text-zinc-500 w-4">{idx + 1}</span>
                            <div className="text-zinc-400">{def.icon}</div>
                            <span className="text-xs font-bold text-zinc-200">{def.label}</span>
                            
                            <button 
                              onClick={() => {
                                const node = selectedNode as ActionNode;
                                startEditing(node.id);
                                updateNode(node.id, { commands: node.commands.filter(c => c.id !== cmd.id) });
                                commitEditing();
                              }}
                              className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                         </div>
                         
                         <div className="grid gap-2">
                           {def.params.map(param => (
                             <div key={param.key} className="flex items-center gap-2">
                               <label className="text-[10px] text-zinc-500 w-20 truncate">{param.label}</label>
                               <input 
                                 type={param.type}
                                 value={cmd.params[param.key] || ''}
                                 onChange={(e) => {
                                    const node = selectedNode as ActionNode;
                                    startEditing(node.id);
                                    const newCommands = [...node.commands];
                                    const val = param.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                                    newCommands[idx] = { 
                                      ...cmd, 
                                      params: { ...cmd.params, [param.key]: val } 
                                    };
                                    updateNode(node.id, { commands: newCommands });
                                 }}
                                 onBlur={commitEditing}
                                 className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-300"
                               />
                             </div>
                           ))}
                         </div>
                      </div>
                    );
                 })}
                 
                 {(!((selectedNode as ActionNode).commands?.length)) && (
                    <div className="text-center text-[10px] text-zinc-600 italic py-4 border border-dashed border-zinc-800 rounded">
                       点击上方按钮添加指令
                    </div>
                 )}
              </div>
           </div>
        )}


        {/* 3. MODULES / ADD-ONS (Optional) */}
        
        {/* Module: Voiceover */}
        {(selectedNode as DialogueNode).voiceId !== undefined && (
          <div className="border border-zinc-700 rounded bg-zinc-800/30 p-3 relative group">
             <button onClick={() => removeAddon('voiceId')} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
             <div className="flex items-center gap-2 mb-2 text-indigo-400">
                <Mic className="w-3 h-3" />
                <span className="text-xs font-bold uppercase">语音配置</span>
             </div>
             <input 
                type="text"
                placeholder="Voice ID / URL..."
                value={(selectedNode as DialogueNode).voiceId}
                onChange={(e) => {
                   startEditing(selectedNode.id);
                   updateNode(selectedNode.id, { voiceId: e.target.value });
                }}
                onBlur={commitEditing}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
             />
          </div>
        )}

        {/* Module: Expression */}
        {(selectedNode as DialogueNode).expression !== undefined && (
          <div className="border border-zinc-700 rounded bg-zinc-800/30 p-3 relative group">
             <button onClick={() => removeAddon('expression')} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
             <div className="flex items-center gap-2 mb-2 text-indigo-400">
                <Settings2 className="w-3 h-3" />
                <span className="text-xs font-bold uppercase">表情 (Expression)</span>
             </div>
             <input 
                type="text"
                placeholder="e.g. neutral, happy, angry"
                value={(selectedNode as DialogueNode).expression}
                onChange={(e) => {
                   startEditing(selectedNode.id);
                   updateNode(selectedNode.id, { expression: e.target.value });
                }}
                onBlur={commitEditing}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
             />
          </div>
        )}

        {/* Module: Placement */}
        {(selectedNode as DialogueNode).placement !== undefined && (
          <div className="border border-zinc-700 rounded bg-zinc-800/30 p-3 relative group">
             <button onClick={() => removeAddon('placement')} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
             <div className="flex items-center gap-2 mb-2 text-indigo-400">
                <LayoutTemplate className="w-3 h-3" />
                <span className="text-xs font-bold uppercase">站位 (Placement)</span>
             </div>
             <div className="flex gap-1 bg-zinc-900 p-1 rounded border border-zinc-700">
                {(['left', 'center', 'right'] as const).map(p => (
                   <button 
                     key={p}
                     onClick={() => {
                        startEditing(selectedNode.id);
                        updateNode(selectedNode.id, { placement: p });
                        commitEditing();
                     }}
                     className={`flex-1 py-1 text-[10px] rounded uppercase transition-colors ${
                       (selectedNode as DialogueNode).placement === p 
                       ? 'bg-zinc-700 text-white font-bold' 
                       : 'text-zinc-500 hover:text-zinc-300'
                     }`}
                   >
                     {p}
                   </button>
                ))}
             </div>
          </div>
        )}

        {/* Module: BGM */}
        {(selectedNode as LocationNode).bgm !== undefined && (
          <div className="border border-zinc-700 rounded bg-zinc-800/30 p-3 relative group">
             <button onClick={() => removeAddon('bgm')} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
             <div className="flex items-center gap-2 mb-2 text-pink-400">
                <Music className="w-3 h-3" />
                <span className="text-xs font-bold uppercase">背景音乐</span>
             </div>
             <input 
                type="text"
                placeholder="Audio ID..."
                value={(selectedNode as LocationNode).bgm}
                onChange={(e) => {
                   startEditing(selectedNode.id);
                   updateNode(selectedNode.id, { bgm: e.target.value });
                }}
                onBlur={commitEditing}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
             />
          </div>
        )}

        {/* Module: Filter */}
        {(selectedNode as LocationNode).filter !== undefined && (
          <div className="border border-zinc-700 rounded bg-zinc-800/30 p-3 relative group">
             <button onClick={() => removeAddon('filter')} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
             <div className="flex items-center gap-2 mb-2 text-teal-400">
                <Settings2 className="w-3 h-3" />
                <span className="text-xs font-bold uppercase">视觉滤镜 (Filter)</span>
             </div>
             <input 
                type="text"
                placeholder="CSS filter e.g. grayscale(100%)"
                value={(selectedNode as LocationNode).filter}
                onChange={(e) => {
                   startEditing(selectedNode.id);
                   updateNode(selectedNode.id, { filter: e.target.value });
                }}
                onBlur={commitEditing}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
             />
          </div>
        )}
        
        {/* Module: Default Next Node (Else Path for Branch) */}
        {(selectedNode as BranchNode).defaultNextNodeId !== undefined && (
           <div className="border border-zinc-700 rounded bg-zinc-800/30 p-3 relative group">
              <button onClick={() => removeAddon('defaultNextNodeId')} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
              <div className="flex items-center gap-2 mb-2 text-amber-400">
                <Split className="w-3 h-3" />
                <span className="text-xs font-bold uppercase">默认路径 (Else)</span>
              </div>
              <div className="text-[10px] text-zinc-500 mb-1">当所有条件都不满足时：</div>
              <div className="text-xs text-zinc-400 p-1 bg-zinc-900 rounded border border-zinc-800">
                 从画布连接点连接目标...
              </div>
           </div>
        )}

        {/* Module: Advanced Mode (Variable) */}
        {(selectedNode as VariableSetterNode).isAdvanced && (
           <div className="border border-zinc-700 rounded bg-zinc-800/30 p-3 relative group">
              <button onClick={() => removeAddon('isAdvanced')} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
              <div className="flex items-center gap-2 mb-2 text-purple-400">
                <Code className="w-3 h-3" />
                <span className="text-xs font-bold uppercase">高级表达式</span>
              </div>
              <textarea 
                rows={3}
                placeholder="e.g. coin = coin + (level * 10)"
                value={(selectedNode as VariableSetterNode).value}
                onChange={(e) => {
                   startEditing(selectedNode.id);
                   updateNode(selectedNode.id, { value: e.target.value });
                }}
                onBlur={commitEditing}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 font-mono resize-none focus:outline-none focus:border-purple-500"
              />
           </div>
        )}

      </div>

      {/* 4. FOOTER: Add Property Button */}
      {availableAddons.length > 0 && (
        <div className="p-4 border-t border-zinc-800 relative">
          {!showAddonMenu ? (
            <button 
              onClick={() => setShowAddonMenu(true)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold rounded border border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-3 h-3" /> 添加属性 (Add Property)
            </button>
          ) : (
            <div className="bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
               <div className="p-2 border-b border-zinc-700 flex justify-between items-center bg-zinc-900/50">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">可用模块</span>
                  <button onClick={() => setShowAddonMenu(false)} className="text-zinc-500 hover:text-white"><Plus className="w-3 h-3 rotate-45" /></button>
               </div>
               <div className="max-h-40 overflow-y-auto">
                 {availableAddons.map((addon) => (
                    <button
                      key={addon.key}
                      onClick={() => enableAddon(addon.key, addon.defaultValue)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 transition-colors"
                    >
                      <div className="text-zinc-500">{addon.icon}</div>
                      {addon.label}
                    </button>
                 ))}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Inspector;
