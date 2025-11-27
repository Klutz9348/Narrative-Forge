
import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Variable, Users, Package, Search, Trash2, Plus, Image as ImageIcon, Gauge, Zap, ShoppingCart } from 'lucide-react';

export const AttributeEditor: React.FC = () => {
    const { story, addAttribute, updateAttribute, removeAttribute } = useEditorStore();
    
    return (
        <div className="flex flex-col h-full bg-[#121212] p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                            <Gauge className="w-6 h-6 text-purple-500" />
                            属性与状态 (Attributes & State)
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">定义游戏运行时的 RPG 属性、资源货币和全局状态标识。</p>
                    </div>
                    <button onClick={addAttribute} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-semibold shadow-lg shadow-purple-900/20">
                        <Plus className="w-4 h-4" /> 新建属性
                    </button>
                </div>

                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-800/80 text-zinc-500 uppercase font-mono text-xs backdrop-blur-sm sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-semibold w-1/4">Key & Name</th>
                                <th className="px-6 py-4 font-semibold w-1/6">Type</th>
                                <th className="px-6 py-4 font-semibold w-1/4">Default Value</th>
                                <th className="px-6 py-4 font-semibold w-1/4">Range (Min/Max)</th>
                                <th className="px-6 py-4 font-semibold text-right w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                             {story.attributes.map(attr => (
                                <tr key={attr.id} className="hover:bg-zinc-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-500/20">
                                                    {attr.key}
                                                </span>
                                            </div>
                                            <input 
                                                className="bg-transparent border-b border-transparent focus:border-purple-500 text-zinc-200 font-semibold focus:outline-none transition-colors w-full"
                                                value={attr.name}
                                                placeholder="Display Name"
                                                onChange={(e) => updateAttribute(attr.id, { name: e.target.value })}
                                            />
                                            <input 
                                                className="bg-transparent text-xs text-zinc-500 focus:text-zinc-300 focus:outline-none w-full"
                                                value={attr.key}
                                                placeholder="unique_key"
                                                onChange={(e) => updateAttribute(attr.id, { key: e.target.value })}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top pt-5">
                                        <select 
                                            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 w-full"
                                            value={attr.type}
                                            onChange={(e) => updateAttribute(attr.id, { type: e.target.value as any })}
                                        >
                                            <option value="number">Number (数值)</option>
                                            <option value="boolean">Boolean (布尔)</option>
                                            <option value="string">String (文本)</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 align-top pt-5">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type={attr.type === 'number' ? 'number' : 'text'}
                                                className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-green-400 font-mono w-full focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-900"
                                                value={attr.defaultValue}
                                                onChange={(e) => {
                                                    const val = attr.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                                                    updateAttribute(attr.id, { defaultValue: val });
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top pt-5">
                                        {attr.type === 'number' ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    placeholder="Min"
                                                    className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-400 w-20 text-center focus:outline-none focus:border-zinc-500"
                                                    value={attr.min ?? ''}
                                                    onChange={(e) => updateAttribute(attr.id, { min: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                />
                                                <span className="text-zinc-600">-</span>
                                                <input 
                                                    type="number"
                                                    placeholder="Max"
                                                    className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-400 w-20 text-center focus:outline-none focus:border-zinc-500"
                                                    value={attr.max ?? ''}
                                                    onChange={(e) => updateAttribute(attr.id, { max: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-zinc-600 text-xs italic">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right align-top pt-5">
                                        <button 
                                            onClick={() => removeAttribute(attr.id)}
                                            className="text-zinc-600 hover:text-red-400 p-2 rounded-md hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Attribute"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                             ))}
                        </tbody>
                    </table>
                     {story.attributes.length === 0 && (
                        <div className="p-12 text-center text-zinc-600 flex flex-col items-center gap-2">
                            <Gauge className="w-8 h-8 opacity-20" />
                            <p>暂无属性定义。添加属性以追踪 HP、SAN 值或金币。</p>
                        </div>
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
             <div className="max-w-3xl mx-auto w-full">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 bg-zinc-800 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl shrink-0 group relative">
                        <img src={character.avatarUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <ImageIcon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-100 mb-1">
                             {character.name}
                        </h1>
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">ID: {character.id}</span>
                    </div>
                </div>

                <div className="grid gap-8">
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2">
                            <Users className="w-4 h-4" /> 基础信息
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-zinc-400">显示名称</label>
                                <input 
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-2.5 text-zinc-200 focus:border-rose-500 focus:outline-none transition-colors"
                                    value={character.name}
                                    onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-zinc-400">头像地址</label>
                                <input 
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-2.5 text-zinc-200 font-mono text-xs focus:border-rose-500 focus:outline-none transition-colors"
                                    value={character.avatarUrl}
                                    onChange={(e) => updateCharacter(character.id, { avatarUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400">角色备注 / 设定</label>
                            <textarea 
                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-sm text-zinc-300 focus:border-rose-500 focus:outline-none min-h-[100px] resize-none"
                                value={character.description || ''}
                                onChange={(e) => updateCharacter(character.id, { description: e.target.value })}
                                placeholder="输入角色背景故事、性格特征等..."
                            />
                        </div>
                    </section>
                </div>
             </div>
        </div>
    );
};

export const ItemEditor: React.FC<{ id?: string }> = ({ id }) => {
    const { story, updateItem, updateAttribute } = useEditorStore();
    const item = story.items.find(i => i.id === id);

    if (!item) return <div className="p-8 text-zinc-500">Item not found.</div>;

    // Helper to toggle stackable
    const toggleStackable = () => updateItem(item.id, { stackable: !item.stackable });

    return (
        <div className="flex flex-col h-full bg-[#121212] p-8 overflow-y-auto">
             <div className="max-w-3xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-amber-900/20 rounded-lg border border-amber-500/30 flex items-center justify-center">
                             {item.icon ? <img src={item.icon} className="w-full h-full object-cover rounded-lg" /> : <Package className="w-8 h-8 text-amber-500" />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-100">{item.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-mono text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">ID: {item.id}</span>
                                {item.stackable && <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-900/20 px-1.5 py-0.5 rounded">Stackable</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Col: Basic Info */}
                    <div className="space-y-6">
                        <section className="space-y-4">
                            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">基础信息</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-zinc-400 block mb-1">名称</label>
                                    <input 
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 focus:border-amber-500 focus:outline-none"
                                        value={item.name}
                                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 block mb-1">图标 URL</label>
                                    <input 
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-300 font-mono focus:border-amber-500 focus:outline-none"
                                        value={item.icon || ''}
                                        onChange={(e) => updateItem(item.id, { icon: e.target.value })}
                                        placeholder="http://..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 block mb-1">描述</label>
                                    <textarea 
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-300 focus:border-amber-500 focus:outline-none min-h-[80px]"
                                        value={item.description}
                                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="stackable" checked={item.stackable || false} onChange={toggleStackable} className="accent-amber-500" />
                                    <label htmlFor="stackable" className="text-sm text-zinc-300 cursor-pointer select-none">允许堆叠 (Stackable)</label>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Col: Crafting Recipe */}
                    <div className="space-y-6">
                        <section className="space-y-4">
                            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" /> 合成配方 (Crafting)
                            </h2>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                <div className="space-y-4">
                                    {/* Cost Attribute (Currency) */}
                                    <div>
                                        <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">消耗资源 (Currency Cost)</label>
                                        <div className="flex gap-2">
                                            <select 
                                                className="flex-1 bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-zinc-300 focus:outline-none"
                                                value={item.recipe?.costAttribute?.attributeId || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const currentRecipe = item.recipe || { ingredients: [] };
                                                    if (!val) {
                                                        const { costAttribute, ...rest } = currentRecipe;
                                                        updateItem(item.id, { recipe: rest });
                                                    } else {
                                                        updateItem(item.id, { recipe: { ...currentRecipe, costAttribute: { attributeId: val, amount: currentRecipe.costAttribute?.amount || 0 } } });
                                                    }
                                                }}
                                            >
                                                <option value="">无消耗</option>
                                                {story.attributes.filter(a => a.type === 'number').map(attr => (
                                                    <option key={attr.id} value={attr.id}>{attr.name}</option>
                                                ))}
                                            </select>
                                            {item.recipe?.costAttribute && (
                                                <input 
                                                    type="number"
                                                    className="w-20 bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-zinc-300 focus:outline-none"
                                                    placeholder="Amount"
                                                    value={item.recipe.costAttribute.amount}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const currentRecipe = item.recipe!;
                                                        updateItem(item.id, { recipe: { ...currentRecipe, costAttribute: { ...currentRecipe.costAttribute!, amount: val } } });
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Ingredients */}
                                    <div>
                                        <label className="text-xs text-zinc-500 uppercase font-bold mb-2 block">所需材料 (Ingredients)</label>
                                        <div className="space-y-2">
                                            {item.recipe?.ingredients.map((ing, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <select 
                                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-zinc-300 focus:outline-none"
                                                        value={ing.itemId}
                                                        onChange={(e) => {
                                                            const newIngredients = [...(item.recipe?.ingredients || [])];
                                                            newIngredients[idx] = { ...ing, itemId: e.target.value };
                                                            updateItem(item.id, { recipe: { ...item.recipe, ingredients: newIngredients } as any });
                                                        }}
                                                    >
                                                        <option value="" disabled>选择物品...</option>
                                                        {story.items.filter(i => i.id !== item.id).map(si => (
                                                            <option key={si.id} value={si.id}>{si.name}</option>
                                                        ))}
                                                    </select>
                                                    <span className="text-zinc-500 text-xs">x</span>
                                                    <input 
                                                        type="number"
                                                        className="w-16 bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-zinc-300 focus:outline-none text-center"
                                                        value={ing.count}
                                                        onChange={(e) => {
                                                            const newIngredients = [...(item.recipe?.ingredients || [])];
                                                            newIngredients[idx] = { ...ing, count: parseFloat(e.target.value) || 1 };
                                                            updateItem(item.id, { recipe: { ...item.recipe, ingredients: newIngredients } as any });
                                                        }}
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const newIngredients = item.recipe?.ingredients.filter((_, i) => i !== idx);
                                                            updateItem(item.id, { recipe: { ...item.recipe, ingredients: newIngredients } as any });
                                                        }}
                                                        className="text-zinc-600 hover:text-red-400"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            <button 
                                                onClick={() => {
                                                    const currentRecipe = item.recipe || { ingredients: [] };
                                                    // Default to first available item
                                                    const firstItem = story.items.find(i => i.id !== item.id);
                                                    if(firstItem) {
                                                        updateItem(item.id, { recipe: { ...currentRecipe, ingredients: [...currentRecipe.ingredients, { itemId: firstItem.id, count: 1 }] } });
                                                    }
                                                }}
                                                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 mt-2"
                                                disabled={story.items.length <= 1}
                                            >
                                                <Plus className="w-3 h-3" /> 添加材料
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
             </div>
        </div>
    );
};

export const ShopEditor: React.FC<{ id?: string }> = ({ id }) => {
    const { story, updateShop } = useEditorStore();
    const shop = story.shops?.find(s => s.id === id);

    if (!shop) return <div className="p-8 text-zinc-500">Shop not found.</div>;

    const inventory = shop.inventory || [];

    return (
        <div className="flex flex-col h-full bg-[#121212] p-8 overflow-y-auto">
             <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-zinc-800">
                    <div className="w-16 h-16 bg-emerald-900/20 rounded-lg border border-emerald-500/30 flex items-center justify-center">
                        <ShoppingCart className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">{shop.name}</h1>
                        <span className="text-xs font-mono text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">COMMERCE: {shop.id}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">商店信息</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-zinc-400 block mb-1">名称</label>
                                <input 
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 focus:border-emerald-500 focus:outline-none"
                                    value={shop.name}
                                    onChange={(e) => updateShop(shop.id, { name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-400 block mb-1">背景图 URL</label>
                                <input 
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-300 font-mono focus:border-emerald-500 focus:outline-none"
                                    value={shop.background || ''}
                                    onChange={(e) => updateShop(shop.id, { background: e.target.value })}
                                    placeholder="http://..."
                                />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-400 block mb-1">欢迎语 / 描述</label>
                                <textarea 
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-300 focus:border-emerald-500 focus:outline-none min-h-[80px]"
                                    value={shop.description}
                                    onChange={(e) => updateShop(shop.id, { description: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Inventory */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-500" /> 上架商品 (Inventory)
                            </h2>
                            <button 
                                onClick={() => {
                                    const firstItem = story.items[0];
                                    const firstCurrency = story.attributes.find(a => a.type === 'number');
                                    if(firstItem && firstCurrency) {
                                        updateShop(shop.id, { 
                                            inventory: [...inventory, { itemId: firstItem.id, price: 100, currencyAttributeId: firstCurrency.id }] 
                                        });
                                    }
                                }}
                                className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                                disabled={story.items.length === 0}
                            >
                                <Plus className="w-3 h-3" /> 添加商品
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {inventory.map((item, idx) => (
                                <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded p-3 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <select 
                                            className="flex-1 bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 focus:outline-none"
                                            value={item.itemId}
                                            onChange={(e) => {
                                                const newInv = [...inventory];
                                                newInv[idx] = { ...item, itemId: e.target.value };
                                                updateShop(shop.id, { inventory: newInv });
                                            }}
                                        >
                                            {story.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                        <button 
                                            onClick={() => {
                                                const newInv = inventory.filter((_, i) => i !== idx);
                                                updateShop(shop.id, { inventory: newInv });
                                            }}
                                            className="text-zinc-600 hover:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500">Price:</span>
                                        <input 
                                            type="number"
                                            className="w-20 bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 focus:outline-none"
                                            value={item.price}
                                            onChange={(e) => {
                                                const newInv = [...inventory];
                                                newInv[idx] = { ...item, price: parseFloat(e.target.value) || 0 };
                                                updateShop(shop.id, { inventory: newInv });
                                            }}
                                        />
                                        <select 
                                            className="flex-1 bg-zinc-950 border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 focus:outline-none"
                                            value={item.currencyAttributeId}
                                            onChange={(e) => {
                                                const newInv = [...inventory];
                                                newInv[idx] = { ...item, currencyAttributeId: e.target.value };
                                                updateShop(shop.id, { inventory: newInv });
                                            }}
                                        >
                                            {story.attributes.filter(a => a.type === 'number').map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                            {inventory.length === 0 && (
                                <div className="text-center text-xs text-zinc-600 py-4 border border-dashed border-zinc-800 rounded">暂无商品</div>
                            )}
                        </div>
                    </section>
                </div>
             </div>
        </div>
    );
};

export const ClueEditor: React.FC<{ id?: string }> = ({ id }) => {
    const { story, updateClue } = useEditorStore();
    const clue = story.clues.find(c => c.id === id);

    if (!clue) return <div className="p-8 text-zinc-500">Clue not found.</div>;

    const owners = clue.owners || [];

    const toggleOwner = (charId: string) => {
        if (owners.includes(charId)) {
            updateClue(clue.id, { owners: owners.filter(id => id !== charId) });
        } else {
            updateClue(clue.id, { owners: [...owners, charId] });
        }
    };

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

                    {/* NEW: Knowledge Ownership */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-400 uppercase">初始持有者 (Initial Knowledge)</label>
                        <div className="bg-zinc-900 border border-zinc-700 rounded p-3 space-y-2">
                            {story.characters.map(char => (
                                <div key={char.id} className="flex items-center gap-3">
                                    <input 
                                        type="checkbox"
                                        checked={owners.includes(char.id)}
                                        onChange={() => toggleOwner(char.id)}
                                        className="w-4 h-4 text-indigo-500 bg-zinc-800 border-zinc-600 rounded"
                                    />
                                    <div className="flex items-center gap-2">
                                        <img src={char.avatarUrl} className="w-5 h-5 rounded-full" />
                                        <span className="text-sm text-zinc-300">{char.name}</span>
                                    </div>
                                </div>
                            ))}
                            {story.characters.length === 0 && <span className="text-xs text-zinc-500">无可用角色</span>}
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