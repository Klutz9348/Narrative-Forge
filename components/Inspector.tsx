
import React, { useMemo, useState } from 'react';
import { MousePointer2, MoreVertical, Wand2, Plus, Trash2, ArrowRightCircle, Mic, Music, LayoutTemplate, Settings2, Code, Split, Zap, PlayCircle, StopCircle, Target, Clapperboard, Timer, Smartphone, MessageSquare, ImageIcon, Play, Gauge, Package, MinusCircle, ChevronDown, ChevronRight, Vote, Search, Share2, ShoppingCart } from 'lucide-react';
import { NodeType, DialogueNode, BranchNode, JumpNode, LocationNode, NodeEvent, Hotspot, ActionNode, ScriptAction, LogicOperator, VariableType, VoteNode, ScriptActionType } from '../types';
import * as GeminiService from '../services/geminiService';
import { useEditorStore } from '../store/useEditorStore';
import { ParamConfig } from '../engine/logic/types';
import { getActionCatalog } from '../engine/logic/uiCatalog';
import { useShallow } from 'zustand/react/shallow';

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  [NodeType.START]: '开始 (Start)',
  [NodeType.DIALOGUE]: '对话 (Dialogue)',
  [NodeType.LOCATION]: '场景 (Location)',
  [NodeType.BRANCH]: '逻辑分支 (Branch)',
  [NodeType.SEQUENCE]: '顺序执行 (Sequence)',
  [NodeType.SWITCH]: '条件切换 (Switch)',
  [NodeType.JUMP]: '章节跳转 (Jump)',
  [NodeType.ACTION]: '动作序列 (Action Script)',
  [NodeType.VOTE]: '投票 (Vote)',
};

// Definition of available add-ons per node type
const ADDON_DEFINITIONS: Record<NodeType, { key: string; label: string; icon: React.ReactNode; defaultValue: any }[]> = {
  [NodeType.START]: [],
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
  [NodeType.SEQUENCE]: [],
  [NodeType.SWITCH]: [],
  [NodeType.JUMP]: [],
  [NodeType.ACTION]: [],
  [NodeType.VOTE]: []
};

// Helper to resolve icons from string name (Simple map for now, could be dynamic)
const getIcon = (name?: string, colorClass?: string) => {
    const className = `w-3 h-3 ${colorClass || ''}`;
    switch(name) {
        case 'Gauge': return <Gauge className={className} />;
        case 'Package': return <Package className={className} />;
        case 'MinusCircle': return <MinusCircle className={className} />;
        case 'Search': return <Search className={className} />;
        case 'Share2': return <Share2 className={className} />;
        case 'ShoppingCart': return <ShoppingCart className={className} />;
        case 'Zap': return <Zap className={className} />;
        case 'Timer': return <Timer className={className} />;
        case 'Smartphone': return <Smartphone className={className} />;
        case 'MessageSquare': return <MessageSquare className={className} />;
        default: return <Zap className={className} />;
    }
};

const OPERATORS_BY_TYPE: Record<VariableType, LogicOperator[]> = {
  'boolean': ['==', '!='],
  'number': ['==', '!=', '>', '>=', '<', '<='],
  'string': ['==', '!=', 'contains']
};

// --- Reusable Action Stack Editor (Registry Driven) ---
const ActionStackEditor: React.FC<{
  actions: ScriptAction[];
  onChange: (actions: ScriptAction[]) => void;
  onBlur: () => void;
}> = ({ actions, onChange, onBlur }) => {
  const actionDefs = getActionCatalog();
  const actionDefMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof getActionCatalog>[number]> = {};
    actionDefs.forEach(def => { map[def.id] = def; });
    return map;
  }, [actionDefs]);
  // Only select meta data needed for dropdowns
  const { characters, items, clues, attributes, shops } = useEditorStore(useShallow(state => ({
      characters: state.story.characters,
      items: state.story.items,
      clues: state.story.clues,
      attributes: state.story.attributes,
      shops: state.story.shops
  })));

  const [showMenu, setShowMenu] = useState(false);

  const addAction = (type: string) => {
    const newAction: ScriptAction = {
      id: `act_${Date.now()}`,
      type,
      params: {}
    };
    onChange([...actions, newAction]);
    onBlur(); // Commit
    setShowMenu(false);
  };

  const removeAction = (id: string) => {
    onChange(actions.filter(a => a.id !== id));
    onBlur();
  };

  const updateActionParam = (id: string, key: string, value: any) => {
    onChange(actions.map(a => a.id === id ? { ...a, params: { ...a.params, [key]: value } } : a));
  };

  const renderInput = (action: ScriptAction, param: ParamConfig, value: any, onChange: (val: any) => void) => {
      const commonClasses = "bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-zinc-300 text-xs w-full focus:outline-none focus:border-indigo-500";
      
      // Detect attribute type for UpdateAttribute to drive boolean/string UI
      let attributeType: VariableType | undefined;
      const isUpdateAttr = action.type === ScriptActionType.UPDATE_ATTRIBUTE;
      if (isUpdateAttr) {
        const attrId = action.params?.attributeId;
        const attr = attributes.find(a => a.id === attrId);
        attributeType = attr?.type;
      }

      // Boolean value input
      if (param.type === 'boolean' || (param.name === 'value' && action.type === ScriptActionType.UPDATE_ATTRIBUTE && attributeType === 'boolean')) {
          const valStr = value === undefined ? String(param.defaultValue ?? false) : String(value);
          return (
              <select
                className={commonClasses}
                value={valStr}
                onChange={(e) => onChange(e.target.value === 'true')}
                onBlur={onBlur}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
          );
      }

      // Boolean op input: only "="
      if (param.name === 'op' && isUpdateAttr && attributeType === 'boolean') {
          return (
              <select
                className={commonClasses}
                value={value || 'set'}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
              >
                <option value="set">=</option>
              </select>
          );
      }
      if (param.name === 'op' && isUpdateAttr && attributeType === 'string') {
          return (
              <select
                className={commonClasses}
                value={value || 'set'}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
              >
                <option value="set">=</option>
              </select>
          );
      }
      
      if (param.type === 'select' && param.options) {
          return (
              <select 
                className={commonClasses}
                value={value || param.defaultValue || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
              >
                  {param.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          );
      }

      if (param.type === 'entity') {
          let options: {id: string, name: string}[] = [];
          if (param.entityType === 'character') options = characters;
          if (param.entityType === 'item') options = items;
          if (param.entityType === 'clue') options = clues;
          if (param.entityType === 'attribute') options = attributes;
          if (param.entityType === 'shop') options = shops || [];

          return (
              <select 
                className={commonClasses}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
              >
                  <option value="">-- Select {param.entityType} --</option>
                  {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
          );
      }

      if (param.name === 'value' && isUpdateAttr && attributeType === 'string') {
          return (
              <input 
                type="text"
                className={commonClasses}
                value={value !== undefined ? value : (param.defaultValue || '')}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={param.placeholder}
              />
          );
      }

      if (param.type === 'number') {
          return (
              <input 
                type="number"
                className={commonClasses}
                value={value !== undefined ? value : (param.defaultValue || '')}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onBlur={onBlur}
                placeholder={param.placeholder}
              />
          );
      }

      // Default String
      return (
          <input 
            type="text"
            className={commonClasses}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={param.placeholder}
          />
      );
  };

  return (
    <div className="space-y-2">
      {actions.map((action, idx) => {
        const def = actionDefMap[action.type];
        if (!def) return <div key={action.id} className="text-red-500 text-xs">Unknown Action: {action.type}</div>;

        return (
          <div key={action.id} className="bg-zinc-800/80 border border-zinc-700/50 rounded p-2 text-xs relative group">
             {/* Header */}
             <div className="flex items-center gap-2 mb-2">
               <span className="font-mono text-zinc-600 w-4 text-center">{idx + 1}</span>
               {getIcon(def.iconName, def.colorClass)}
               <span className="font-bold text-zinc-300">{def.label}</span>
               <button onClick={() => removeAction(action.id)} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Trash2 className="w-3 h-3" />
               </button>
             </div>

             {/* Dynamic Params Form */}
             <div className="pl-6 space-y-2">
                {def.params.map(param => (
                    <div key={param.name} className="flex flex-col gap-1">
                        {param.label && <label className="text-[10px] text-zinc-500 uppercase">{param.label}</label>}
                        {renderInput(action, param, action.params[param.name], (val) => updateActionParam(action.id, param.name, val))}
                    </div>
                ))}
             </div>
          </div>
        );
      })}

      <div className="relative">
        {!showMenu ? (
          <button 
            onClick={() => setShowMenu(true)}
            className="w-full py-1.5 border border-dashed border-zinc-700 hover:border-zinc-500 rounded text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" /> 添加指令
          </button>
        ) : (
          <div className="bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 z-50 max-h-60 overflow-y-auto">
             <div className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1 bg-zinc-900/50 flex justify-between sticky top-0">
                <span>Select Action</span>
                <button onClick={() => setShowMenu(false)}><Plus className="w-3 h-3 rotate-45" /></button>
             </div>
             {actionDefs.map(def => (
               <button 
                 key={def.id} 
                 onClick={() => addAction(def.id)} 
                 className="w-full text-left px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 transition-colors"
               >
                 {getIcon(def.iconName, def.colorClass)}
                 {def.label}
               </button>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Inspector: React.FC = () => {
  const { updateNode, startEditing, commitEditing } = useEditorStore(useShallow(state => ({
      updateNode: state.updateNode,
      startEditing: state.startEditing,
      commitEditing: state.commitEditing
  })));
  
  // Specific Selector for Active Node Data
  const selectedNode = useEditorStore(useShallow(state => {
      const activeSeg = state.story.segments.find(s => s.id === state.story.activeSegmentId);
      if (!activeSeg || state.selectedIds.length !== 1) return null;
      return activeSeg.nodes[state.selectedIds[0]] || null;
  }));

  // Meta Data for Dropdowns
  const { characters, attributes } = useEditorStore(useShallow(state => ({
      characters: state.story.characters,
      attributes: state.story.attributes
  })));
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiVariations, setAiVariations] = useState<string[]>([]);
  const [showAddonMenu, setShowAddonMenu] = useState(false);
  const [showEventMenu, setShowEventMenu] = useState(false);
  
  // State to track expanded events in Location Node
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const handleAiGenerate = async () => {
    if (!selectedNode || selectedNode.type !== NodeType.DIALOGUE) return;
    setIsGenerating(true);
    setAiVariations([]);
    
    const dialogueNode = selectedNode as DialogueNode;
    const charName = characters.find(c => c.id === dialogueNode.characterId)?.name || "未知角色";
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
    if (!selectedNode) return;
    const exists = (selectedNode.events || []).some(e => e.trigger === trigger && e.targetId === targetId);
    if (exists) {
      setShowEventMenu(false);
      return;
    }
    
    let label: string = trigger;
    if (trigger === 'onClick' && targetId) {
      // Only Location nodes have hotspots
      if (selectedNode.type === NodeType.LOCATION) {
          const hs = (selectedNode as LocationNode).hotspots?.find(h => h.id === targetId);
          label = `Click: ${hs?.name || 'Unknown'}`;
      }
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
      label,
      actions: []
    };

    startEditing(selectedNode.id);
    updateNode(selectedNode.id, { events: [...(selectedNode.events || []), newEvent] });
    commitEditing();
    setShowEventMenu(false);
    setExpandedEventId(newEvent.id); // Auto expand new event
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
          disabled={selectedNode.type === NodeType.START} // Start node name is fixed
          onFocus={() => startEditing(selectedNode.id)}
          onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
          onBlur={commitEditing}
          className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 disabled:opacity-50"
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

        {selectedNode.type === NodeType.START && (
          <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded flex flex-col items-center text-center gap-2">
            <Play className="w-8 h-8 text-emerald-500" />
            <div>
              <h3 className="text-sm font-bold text-emerald-400">章节起点</h3>
              <p className="text-xs text-emerald-200/70 mt-1">
                这是本章节的固定入口。所有剧情都必须从这里开始。此节点不可删除。
              </p>
            </div>
          </div>
        )}
        
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
                {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          </div>
        )}

        {/* Event Manager (Now available for ALL nodes that support events, primarily Location but extendable) */}
        {(selectedNode.type === NodeType.LOCATION) && (
            <div>
               <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">事件与逻辑 (Logic Events)</label>
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
                          {(selectedNode as LocationNode).hotspots
                            ?.filter(hs => !(selectedNode.events || []).some(e => e.trigger === 'onClick' && e.targetId === hs.id))
                            .map(hs => (
                              <button key={hs.id} onClick={() => addEvent('onClick', hs.id)} className="w-full text-left px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2 transition-colors"><Target className="w-3 h-3 text-amber-400" /> Click: {hs.name}</button>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
               </div>
               
               <div className="space-y-1.5">
                  {selectedNode.events?.map(evt => {
                    const isExpanded = expandedEventId === evt.id;
                    return (
                        <div key={evt.id} className="bg-zinc-800 rounded border border-zinc-700 overflow-hidden">
                            {/* Event Header */}
                            <div 
                                className="flex items-center justify-between p-2 cursor-pointer hover:bg-zinc-700/50"
                                onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                            >
                                <div className="flex items-center gap-2 text-xs">
                                    {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-500"/> : <ChevronRight className="w-3 h-3 text-zinc-500"/>}
                                    <Zap className={`w-3 h-3 ${evt.trigger === 'onClick' ? 'text-amber-400' : 'text-indigo-400'}`} />
                                    <span className="text-zinc-300 font-semibold">{evt.label}</span>
                                    <span className="text-[9px] bg-zinc-900 text-amber-400/80 px-1 rounded border border-amber-400/30">Connect to Action node</span>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(selectedNode.id);
                                        const newEvents = (selectedNode.events || []).filter(e => e.id !== evt.id);
                                        updateNode(selectedNode.id, { events: newEvents });
                                        commitEditing();
                                    }}
                                    className="text-zinc-600 hover:text-red-400 p-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                            
                            {/* Actions Editor (Disabled: single-flow model, use graph edges) */}
                            {isExpanded && (
                                <div className="p-3 border-t border-zinc-700 bg-zinc-900/40 text-[11px] text-zinc-400 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-300">
                                        <Zap className="w-3 h-3" />
                                        <span>动作需通过连线到动作节点完成</span>
                                    </div>
                                    <p className="text-zinc-500">将此事件的输出端 (闪电) 连到 <span className="text-cyan-300">Action</span> 节点或条件节点，再串联动作序列。</p>
                                </div>
                            )}
                        </div>
                    );
                  })}
                  {!((selectedNode.events?.length)) && (
                     <div className="text-[10px] text-zinc-600 italic text-center p-2 border border-dashed border-zinc-800 rounded">
                       暂无事件
                     </div>
                  )}
               </div>
            </div>
        )}

        {selectedNode.type === NodeType.BRANCH && (
           <div className="space-y-4">
              <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">条件列表 (Visual Logic)</label>
              
              <div className="space-y-3">
                {(selectedNode as BranchNode).conditions?.map((condition, idx) => {
                  const variable = attributes.find(v => v.id === condition.variableId);
                  const varType = variable?.type || 'string';
                  const availableOps = OPERATORS_BY_TYPE[varType] || OPERATORS_BY_TYPE['string'];

                  return (
                    <div key={condition.id} className="bg-zinc-800 border border-zinc-700 rounded p-2 relative group">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="text-[10px] text-zinc-500 font-mono w-4 text-center">{idx + 1}</div>
                             <div className="text-xs font-bold text-zinc-400">If</div>
                             <button 
                                onClick={() => {
                                  const node = selectedNode as BranchNode;
                                  startEditing(node.id);
                                  updateNode(node.id, { conditions: node.conditions.filter(c => c.id !== condition.id) });
                                  commitEditing();
                                }}
                                className="absolute top-2 right-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                        </div>
                        
                        <div className="grid gap-2">
                           <select 
                              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
                              value={condition.variableId}
                              onChange={(e) => {
                                const node = selectedNode as BranchNode;
                                startEditing(node.id);
                                const newConditions = node.conditions.map(c => c.id === condition.id ? { ...c, variableId: e.target.value } : c);
                                updateNode(node.id, { conditions: newConditions });
                              }}
                              onBlur={commitEditing}
                           >
                             <option value="" disabled>-- 属性 (Attribute) --</option>
                             {attributes.map(v => (
                               <option key={v.id} value={v.id}>{v.name}</option>
                             ))}
                           </select>

                           <div className="flex gap-2">
                             <select 
                                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-amber-300 font-mono focus:outline-none"
                                value={condition.operator}
                                onChange={(e) => {
                                  const node = selectedNode as BranchNode;
                                  startEditing(node.id);
                                  const newConditions = node.conditions.map(c => c.id === condition.id ? { ...c, operator: e.target.value as any } : c);
                                  updateNode(node.id, { conditions: newConditions });
                                }}
                                onBlur={commitEditing}
                             >
                               {availableOps.map(op => <option key={op} value={op}>{op}</option>)}
                             </select>

                             {varType === 'boolean' ? (
                                <select
                                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-green-300 font-mono focus:outline-none"
                                  value={condition.value}
                                  onChange={(e) => {
                                     const node = selectedNode as BranchNode;
                                     startEditing(node.id);
                                     const newConditions = node.conditions.map(c => c.id === condition.id ? { ...c, value: e.target.value } : c);
                                     updateNode(node.id, { conditions: newConditions });
                                  }}
                                  onBlur={commitEditing}
                                >
                                  <option value="true">True</option>
                                  <option value="false">False</option>
                                </select>
                             ) : (
                                <input 
                                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-green-300 font-mono focus:outline-none"
                                  placeholder="Value..."
                                  value={condition.value}
                                  onChange={(e) => {
                                     const node = selectedNode as BranchNode;
                                     startEditing(node.id);
                                     const newConditions = node.conditions.map(c => c.id === condition.id ? { ...c, value: e.target.value } : c);
                                     updateNode(node.id, { conditions: newConditions });
                                  }}
                                  onBlur={commitEditing}
                                />
                             )}
                           </div>
                        </div>
                    </div>
                  );
                })}
                
                {attributes.length === 0 ? (
                  <div className="text-center text-[10px] text-zinc-500 py-4 border border-dashed border-zinc-800 rounded bg-zinc-900/50">
                     请先在 "属性与状态" 面板中添加属性
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      const node = selectedNode as BranchNode;
                      startEditing(node.id);
                      // Default to first variable
                      const firstVar = attributes[0];
                      updateNode(node.id, { conditions: [...(node.conditions || []), { id: `c_${Date.now()}`, variableId: firstVar?.id || '', operator: '==', value: '0' }] });
                      commitEditing();
                    }}
                    className="w-full py-1.5 border border-dashed border-zinc-700 hover:border-zinc-500 rounded text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 添加条件
                  </button>
                )}
              </div>
           </div>
        )}

        {/* Action Node Editor (Updated for ECA) */}
        {selectedNode.type === NodeType.ACTION && (
           <div className="space-y-4">
              <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">指令序列 (Command Sequence)</label>
              <ActionStackEditor 
                  actions={(selectedNode as ActionNode).actions || []}
                  onChange={(newActions) => {
                      startEditing(selectedNode.id);
                      updateNode(selectedNode.id, { actions: newActions });
                  }}
                  onBlur={commitEditing}
              />
           </div>
        )}

        {/* Vote Node Editor */}
        {selectedNode.type === NodeType.VOTE && (
            <div className="space-y-4">
                {/* 1. Question Title */}
                <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">投票问题 (Question)</label>
                    <input 
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm text-zinc-300 focus:border-violet-500 focus:outline-none"
                        value={(selectedNode as VoteNode).voteConfig.title}
                        onChange={(e) => {
                            startEditing(selectedNode.id);
                            updateNode(selectedNode.id, { voteConfig: { ...(selectedNode as VoteNode).voteConfig, title: e.target.value } });
                        }}
                        onBlur={commitEditing}
                    />
                </div>

                {/* 2. Duration */}
                <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1.5">时长 (Duration)</label>
                    <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-zinc-500" />
                        <input 
                            type="number"
                            className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:border-violet-500 focus:outline-none"
                            value={(selectedNode as VoteNode).voteConfig.duration}
                            onChange={(e) => {
                                startEditing(selectedNode.id);
                                updateNode(selectedNode.id, { voteConfig: { ...(selectedNode as VoteNode).voteConfig, duration: parseInt(e.target.value) || 0 } });
                            }}
                            onBlur={commitEditing}
                        />
                        <span className="text-xs text-zinc-500">seconds</span>
                    </div>
                </div>

                {/* 3. Options */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] text-zinc-500 uppercase font-semibold">选项 (Options)</label>
                        <button 
                            onClick={() => {
                                const node = selectedNode as VoteNode;
                                startEditing(node.id);
                                const newId = `opt_${Date.now()}`;
                                updateNode(node.id, { 
                                    voteConfig: { 
                                        ...node.voteConfig, 
                                        options: [...node.voteConfig.options, { id: newId, text: 'New Option', isCorrect: false, score: 0 }] 
                                    } 
                                });
                                commitEditing();
                            }}
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {(selectedNode as VoteNode).voteConfig.options.map((opt, i) => (
                            <div key={opt.id} className="bg-zinc-800 border border-zinc-700 rounded p-2 space-y-2 group">
                                <div className="flex gap-2 items-center">
                                    <input 
                                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
                                        value={opt.text}
                                        onChange={(e) => {
                                            const node = selectedNode as VoteNode;
                                            const newOptions = [...node.voteConfig.options];
                                            newOptions[i] = { ...opt, text: e.target.value };
                                            updateNode(node.id, { voteConfig: { ...node.voteConfig, options: newOptions } });
                                        }}
                                        onBlur={commitEditing}
                                        placeholder="Option Text..."
                                    />
                                    <button 
                                        onClick={() => {
                                            const node = selectedNode as VoteNode;
                                            const newOptions = node.voteConfig.options.filter(o => o.id !== opt.id);
                                            updateNode(node.id, { voteConfig: { ...node.voteConfig, options: newOptions } });
                                            commitEditing();
                                        }}
                                        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-zinc-500">Score</span>
                                        <input 
                                            type="number"
                                            className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-[10px] text-zinc-300 text-center"
                                            value={opt.score || 0}
                                            onChange={(e) => {
                                                const node = selectedNode as VoteNode;
                                                const newOptions = [...node.voteConfig.options];
                                                newOptions[i] = { ...opt, score: parseInt(e.target.value) || 0 };
                                                updateNode(node.id, { voteConfig: { ...node.voteConfig, options: newOptions } });
                                            }}
                                            onBlur={commitEditing}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox"
                                            checked={opt.isCorrect || false}
                                            onChange={(e) => {
                                                const node = selectedNode as VoteNode;
                                                const newOptions = [...node.voteConfig.options];
                                                newOptions[i] = { ...opt, isCorrect: e.target.checked };
                                                updateNode(node.id, { voteConfig: { ...node.voteConfig, options: newOptions } });
                                                commitEditing();
                                            }}
                                            className="rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500/50"
                                        />
                                        <span className="text-[10px] text-zinc-500">Correct Answer</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
