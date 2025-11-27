
import React, { useState } from 'react';
import { Layers, Box, Plus, Type, Image as ImageIcon, Gauge, Trash2, Users, Search, Package, Ghost, ChevronRight, ChevronDown, ShoppingCart } from 'lucide-react';
import { NodeType, NarrativeNode } from '../types';
import { useEditorStore } from '../store/useEditorStore';

const SidebarSection: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode; 
    action?: React.ReactNode 
    defaultOpen?: boolean
}> = ({ title, icon, children, action, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-zinc-800">
            <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold select-none">
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {icon}
                    <span>{title}</span>
                </div>
                {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
            </div>
            {isOpen && <div className="bg-zinc-900/50 pb-2">{children}</div>}
        </div>
    );
};

const Sidebar: React.FC = () => {
  const { story, selectedIds, selectNode, openTab, addCharacter, addItem, addClue, addShop } = useEditorStore();
  const activeSegment = story.segments.find(s => s.id === story.activeSegmentId);

  return (
    <div className="w-64 bg-[#09090b] border-r border-zinc-800 flex flex-col h-full select-none z-10 shrink-0">
      
      {/* App Logo Area */}
      <div className="h-12 flex items-center px-4 border-b border-zinc-800 gap-3 bg-zinc-900/50">
        <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center shrink-0">
             <Ghost className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-zinc-200 tracking-tight">Narrative Forge</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* 1. Hierarchy / Chapters */}
        <SidebarSection title="剧情结构" icon={<Layers className="w-4 h-4 text-indigo-500" />} defaultOpen={true}>
            <div className="px-2 space-y-1 mt-1">
                {/* Segments */}
                {story.segments.map(seg => (
                    <div key={seg.id} className="pl-4">
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${story.activeSegmentId === seg.id ? 'text-zinc-100 bg-zinc-800' : 'text-zinc-500'}`}>
                            <Box className="w-3 h-3" />
                            {seg.name}
                        </div>
                        
                        {/* Nodes (Only for active segment) */}
                        {story.activeSegmentId === seg.id && (
                             <div className="ml-2 pl-2 border-l border-zinc-800 mt-1 space-y-0.5">
                                {(Object.values(seg.nodes) as NarrativeNode[]).map(node => (
                                    <div 
                                        key={node.id}
                                        onClick={() => {
                                            openTab('canvas');
                                            selectNode(node.id);
                                        }}
                                        className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] cursor-pointer ${selectedIds.includes(node.id) ? 'text-indigo-300 bg-indigo-900/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                                    >
                                        {node.type === NodeType.LOCATION ? <ImageIcon className="w-3 h-3" /> : <Type className="w-3 h-3" />}
                                        <span className="truncate">{node.name}</span>
                                    </div>
                                ))}
                             </div>
                        )}
                    </div>
                ))}
            </div>
        </SidebarSection>

        {/* 2. Attributes & State (Renamed) */}
        <SidebarSection 
            title="属性与状态" 
            icon={<Gauge className="w-4 h-4 text-purple-500" />}
            action={
                <button 
                    onClick={() => openTab('variable')}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white mr-2"
                    title="管理属性"
                >
                    <Gauge className="w-3 h-3" />
                </button>
            }
        >
             <div className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer flex items-center gap-2" onClick={() => openTab('variable')}>
                 <span className="italic">点击管理 {story.attributes.length} 个属性 (HP, Coin...)</span>
             </div>
        </SidebarSection>

        {/* 3. Characters */}
        <SidebarSection 
            title="角色列表" 
            icon={<Users className="w-4 h-4 text-rose-500" />}
            action={
                <button onClick={addCharacter} className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white mr-2"><Plus className="w-3 h-3" /></button>
            }
        >
             <div className="px-2 space-y-0.5 mt-1">
                {story.characters.map(char => (
                    <div 
                        key={char.id}
                        onClick={() => openTab('character', char.id, char.name)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-zinc-400 hover:bg-zinc-800 cursor-pointer group"
                    >
                        <div className="w-4 h-4 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                            <img src={char.avatarUrl} className="w-full h-full object-cover" />
                        </div>
                        <span className="truncate flex-1">{char.name}</span>
                    </div>
                ))}
                {story.characters.length === 0 && <div className="px-4 py-1 text-[10px] text-zinc-600">暂无角色</div>}
             </div>
        </SidebarSection>

        {/* 4. Items */}
        <SidebarSection 
            title="道具库" 
            icon={<Package className="w-4 h-4 text-amber-500" />}
            action={
                <button onClick={addItem} className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white mr-2"><Plus className="w-3 h-3" /></button>
            }
        >
             <div className="px-2 space-y-0.5 mt-1">
                {story.items.map(item => (
                    <div 
                        key={item.id}
                        onClick={() => openTab('item', item.id, item.name)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                    >
                        <Package className="w-3 h-3 text-zinc-600" />
                        <span className="truncate flex-1">{item.name}</span>
                    </div>
                ))}
                 {story.items.length === 0 && <div className="px-4 py-1 text-[10px] text-zinc-600">暂无道具</div>}
             </div>
        </SidebarSection>

        {/* 5. Shops */}
        <SidebarSection 
            title="商业 (Shops)" 
            icon={<ShoppingCart className="w-4 h-4 text-emerald-500" />}
            action={
                <button onClick={addShop} className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white mr-2"><Plus className="w-3 h-3" /></button>
            }
        >
             <div className="px-2 space-y-0.5 mt-1">
                {(story.shops || []).map(shop => (
                    <div 
                        key={shop.id}
                        onClick={() => openTab('shop', shop.id, shop.name)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                    >
                        <ShoppingCart className="w-3 h-3 text-zinc-600" />
                        <span className="truncate flex-1">{shop.name}</span>
                    </div>
                ))}
                 {(!story.shops || story.shops.length === 0) && <div className="px-4 py-1 text-[10px] text-zinc-600">暂无商店</div>}
             </div>
        </SidebarSection>

        {/* 6. Clues */}
        <SidebarSection 
            title="线索情报" 
            icon={<Search className="w-4 h-4 text-blue-500" />}
             action={
                <button onClick={addClue} className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white mr-2"><Plus className="w-3 h-3" /></button>
            }
        >
             <div className="px-2 space-y-0.5 mt-1">
                {story.clues.map(clue => (
                    <div 
                        key={clue.id}
                        onClick={() => openTab('clue', clue.id, clue.name)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                    >
                        <Search className="w-3 h-3 text-zinc-600" />
                        <span className="truncate flex-1">{clue.name}</span>
                    </div>
                ))}
                {story.clues.length === 0 && <div className="px-4 py-1 text-[10px] text-zinc-600">暂无线索</div>}
             </div>
        </SidebarSection>

      </div>
      
      <div className="p-2 border-t border-zinc-800 text-[10px] text-zinc-600 text-center">
         v0.6.0 Beta
      </div>
    </div>
  );
};

export default Sidebar;