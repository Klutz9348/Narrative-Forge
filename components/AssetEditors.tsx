
import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Variable, Users, Package, Search, Trash2, Plus, Image as ImageIcon } from 'lucide-react';

export const VariableEditor: React.FC = () => {
    const { story, addGlobalVariable, updateGlobalVariable, removeGlobalVariable } = useEditorStore();
    
    return (
        <div className="flex flex-col h-full bg-[#121212] p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                            <Variable className="w-6 h-6 text-purple-500" />
                            全局变量管理
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">定义游戏运行时的状态变量，用于逻辑判断和剧情分支。</p>
                    </div>
                    <button onClick={addGlobalVariable} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-semibold">
                        <Plus className="w-4 h-4" /> 新建变量
                    </button>
                </div>

                <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-800/50 text-zinc-500 uppercase font-mono text-xs">
                            <tr>
                                <th className="px-4 py-3 font-semibold">变量名 (ID)</th>
                                <th className="px-4 py-3 font-semibold">类型</th>
                                <th className="px-4 py-3 font-semibold">默认值</th>
                                <th className="px-4 py-3 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                             {story.globalVariables.map(v => (
                                <tr key={v.id} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Variable className="w-4 h-4 text-purple-500/50" />
                                            <input 
                                                className="bg-transparent focus:bg-zinc-900 focus:ring-1 focus:ring-purple-500/50 rounded px-2 py-1 text-zinc-200 font-mono w-full"
                                                value={v.name}
                                                onChange={(e) => updateGlobalVariable(v.id, { name: e.target.value })}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <select 
                                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
                                            value={v.type}
                                            onChange={(e) => updateGlobalVariable(v.id, { type: e.target.value as any })}
                                        >
                                            <option value="boolean">Boolean</option>
                                            <option value="number">Number</option>
                                            <option value="string">String</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input 
                                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-green-400 font-mono w-full focus:outline-none focus:border-green-500"
                                            value={v.defaultValue}
                                            onChange={(e) => updateGlobalVariable(v.id, { defaultValue: e.target.value })}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => removeGlobalVariable(v.id)}
                                            className="text-zinc-600 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                             ))}
                        </tbody>
                    </table>
                     {story.globalVariables.length === 0 && (
                        <div className="p-8 text-center text-zinc-600 italic">暂无全局变量，点击右上角添加。</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const CharacterEditor: React.FC<{ id?: string }> = ({ id }) => {
    const { story, updateCharacter } = useEditorStore();
    const character = story.characters.find(c => c.id === id);

    if (!character) return <div className="p-8 text-zinc-500">Character not found.</div>;

    return (
        <div className="flex flex-col h-full bg-[#121212] p-8 overflow-y-auto">
             <div className="max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full overflow-hidden border-2 border-zinc-700 shadow-xl shrink-0">
                        <img src={character.avatarUrl} className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                             {character.name}
                        </h1>
                        <span className="text-xs font-mono text-zinc-600 uppercase">ID: {character.id}</span>
                    </div>
                </div>

                <div className="grid gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">角色名称</label>
                        <input 
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-zinc-200 focus:border-indigo-500 focus:outline-none"
                            value={character.name}
                            onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">头像 URL</label>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-3 text-sm text-zinc-400 font-mono focus:border-indigo-500 focus:outline-none"
                                value={character.avatarUrl}
                                onChange={(e) => updateCharacter(character.id, { avatarUrl: e.target.value })}
                            />
                            <div className="w-12 h-12 bg-zinc-800 rounded border border-zinc-700 overflow-hidden shrink-0">
                                <img src={character.avatarUrl} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">角色描述 / 备注</label>
                        <textarea 
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none min-h-[120px]"
                            value={character.description || ''}
                            onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
                            placeholder="输入角色背景故事、性格特征等..."
                        />
                    </div>
                </div>
             </div>
        </div>
    );
};

export const ItemEditor: React.FC<{ id?: string }> = ({ id }) => {
    const { story, updateItem } = useEditorStore();
    const item = story.items.find(i => i.id === id);

    if (!item) return <div className="p-8 text-zinc-500">Item not found.</div>;

    return (
        <div className="flex flex-col h-full bg-[#121212] p-8 overflow-y-auto">
             <div className="max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-zinc-800">
                    <Package className="w-8 h-8 text-amber-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">
                             {item.name}
                        </h1>
                        <span className="text-xs font-mono text-zinc-600 uppercase">ITEM CONFIG</span>
                    </div>
                </div>

                <div className="grid gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">道具名称</label>
                        <input 
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-zinc-200 focus:border-amber-500 focus:outline-none"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">图标 / 图片 URL</label>
                         <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-3 text-sm text-zinc-400 font-mono focus:border-amber-500 focus:outline-none"
                                value={item.icon || ''}
                                onChange={(e) => updateItem(item.id, { icon: e.target.value })}
                                placeholder="http://..."
                            />
                             <div className="w-12 h-12 bg-zinc-800 rounded border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                                {item.icon ? <img src={item.icon} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-zinc-600" />}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">描述</label>
                        <textarea 
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-sm text-zinc-300 focus:border-amber-500 focus:outline-none min-h-[120px]"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        />
                    </div>
                </div>
             </div>
        </div>
    );
};

export const ClueEditor: React.FC<{ id?: string }> = ({ id }) => {
    const { story, updateClue } = useEditorStore();
    const clue = story.clues.find(c => c.id === id);

    if (!clue) return <div className="p-8 text-zinc-500">Clue not found.</div>;

    return (
        <div className="flex flex-col h-full bg-[#121212] p-8 overflow-y-auto">
             <div className="max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-zinc-800">
                    <Search className="w-8 h-8 text-blue-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">
                             {clue.name}
                        </h1>
                        <span className="text-xs font-mono text-zinc-600 uppercase">INTELLIGENCE</span>
                    </div>
                </div>

                <div className="grid gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">线索名称</label>
                        <input 
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-zinc-200 focus:border-blue-500 focus:outline-none"
                            value={clue.name}
                            onChange={(e) => updateClue(clue.id, { name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">初始状态</label>
                        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded p-3">
                            <input 
                                type="checkbox"
                                checked={clue.revealed}
                                onChange={(e) => updateClue(clue.id, { revealed: e.target.checked })}
                                className="w-5 h-5 text-blue-600 bg-zinc-800 border-zinc-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-zinc-300 text-sm">游戏开始时已发现 (Revealed)</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">详情 / 内容</label>
                        <textarea 
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-sm text-zinc-300 focus:border-blue-500 focus:outline-none min-h-[120px]"
                            value={clue.description}
                            onChange={(e) => updateClue(clue.id, { description: e.target.value })}
                            placeholder="线索的具体内容..."
                        />
                    </div>
                </div>
             </div>
        </div>
    );
};
