import React from 'react';
import { Play, Save, Undo, Redo } from 'lucide-react';
import { useEditorStore } from './store/useEditorStore';

// Components
import Sidebar from './components/Sidebar';
import Inspector from './components/Inspector';
import Canvas from './components/Canvas';

function App() {
  const { story, undo, redo, historyIndex, history } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full relative">
        <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 z-10 shrink-0">
          <div className="flex items-center gap-4">
             <span className="font-semibold text-sm">{story.title}</span>
             <span className="text-zinc-600">/</span>
             <span className="text-zinc-400 text-sm">第一章</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1 mr-4 border-r border-zinc-700 pr-4">
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

            <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded transition-colors text-zinc-300">
              <Play className="w-3 h-3 fill-current" /> 预览
            </button>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-1.5 rounded transition-colors font-semibold">
              <Save className="w-3 h-3" /> 保存
            </button>
          </div>
        </header>

        <Canvas />
      </div>

      <Inspector />
    </div>
  );
}

export default App;
