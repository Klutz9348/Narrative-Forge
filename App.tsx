
import React from 'react';
import { Play, Save, Undo, Redo, X, Box, Variable, Users, Package, Search, Gauge, ShoppingCart } from 'lucide-react';
import { useEditorStore } from './store/useEditorStore';

// Components
import Sidebar from './components/Sidebar';
import Inspector from './components/Inspector';
import Canvas from './components/Canvas';
import { CharacterEditor, ItemEditor, ClueEditor, AttributeEditor, ShopEditor } from './components/AssetEditors';
import { TabType } from './types';

// Helper to get icon for tab
const getTabIcon = (type: TabType) => {
    switch (type) {
        case 'canvas': return <Box className="w-3 h-3 text-indigo-400" />;
        case 'variable': return <Gauge className="w-3 h-3 text-purple-400" />;
        case 'character': return <Users className="w-3 h-3 text-rose-400" />;
        case 'item': return <Package className="w-3 h-3 text-amber-400" />;
        case 'clue': return <Search className="w-3 h-3 text-blue-400" />;
        case 'shop': return <ShoppingCart className="w-3 h-3 text-emerald-400" />;
        default: return <Box className="w-3 h-3" />;
    }
};

function App() {
  const { story, undo, redo, canUndo, canRedo, tabs, activeTabId, setActiveTab, closeTab } = useEditorStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  const renderContent = () => {
      if (!activeTab) return <div className="flex-1 bg-[#121212]" />;

      switch (activeTab.type) {
          case 'canvas': return <Canvas />;
          case 'variable': return <AttributeEditor />; // Replaced VariableEditor
          case 'character': return <CharacterEditor id={activeTab.dataId} />;
          case 'item': return <ItemEditor id={activeTab.dataId} />;
          case 'clue': return <ClueEditor id={activeTab.dataId} />;
          case 'shop': return <ShopEditor id={activeTab.dataId} />;
          default: return <Canvas />;
      }
  };

  return (
    <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* TOP HEADER / TAB BAR */}
        <div className="h-10 bg-[#09090b] border-b border-zinc-800 flex items-center justify-between shrink-0 select-none">
          
          {/* Tabs Container */}
          <div className="flex items-end h-full px-2 gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-w-[calc(100%-200px)]">
             {tabs.map(tab => (
                 <div 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        group relative flex items-center gap-2 px-3 h-8 text-xs rounded-t-md border-t border-x border-transparent cursor-pointer transition-colors min-w-[120px] max-w-[200px]
                        ${activeTabId === tab.id 
                            ? 'bg-[#121212] border-zinc-700 text-zinc-100' 
                            : 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }
                    `}
                 >
                    {getTabIcon(tab.type)}
                    <span className="truncate flex-1">{tab.label}</span>
                    
                    {/* Close Tab Button */}
                    {tab.type !== 'canvas' && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                closeTab(tab.id);
                            }}
                            className="p-0.5 rounded-full hover:bg-zinc-700 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                 </div>
             ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 pr-4 h-full bg-[#09090b] border-l border-zinc-800/50 pl-4">
             <div className="flex items-center gap-1 mr-2">
                <button 
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="撤销"
                >
                  <Undo className="w-4 h-4" />
                </button>
                <button 
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="重做"
                >
                  <Redo className="w-4 h-4" />
                </button>
             </div>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-1.5 rounded transition-colors font-semibold shadow-sm shadow-indigo-900/20">
              <Play className="w-3 h-3 fill-current" /> 运行
            </button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-[#121212]">
            {renderContent()}
        </div>
      </div>

      {/* Inspector is only visible when Canvas is active */}
      {activeTab?.type === 'canvas' && <Inspector />}
    </div>
  );
}

export default App;