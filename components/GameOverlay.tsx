import React, { useEffect, useState } from 'react';
import { X, Package, ShoppingCart, User, Heart, Coins, Brain, ArrowRight, SkipForward } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { useRuntimeStore } from '../store/useRuntimeStore';
import { NarrativeEngine } from '../engine/NarrativeEngine';
import { NodeType, DialogueNode, LocationNode, VoteNode } from '../types';

const EngineInstance = new NarrativeEngine();

const GameOverlay: React.FC = () => {
  const { story } = useEditorStore();
  const runtime = useRuntimeStore();
  
  // Initialize Engine
  useEffect(() => {
    if (!runtime.isRunning) return;

    runtime.reset();
    
    // Bind Event Bus to React State
    const bus = EngineInstance.eventBus;
    
    const handleNodeEnter = ({ node }: any) => {
      runtime.setCurrentNode(node);
      
      // Auto-add dialogue to history
      if (node.type === NodeType.DIALOGUE) {
        const dNode = node as DialogueNode;
        const charName = story.characters.find(c => c.id === dNode.characterId)?.name || '???';
        runtime.addHistory({ id: node.id, speaker: charName, text: dNode.text });
      }
    };

    const handleAttrChange = () => {
      runtime.syncAttributes(EngineInstance.variableStore.getAll().attributes);
    };

    const handleInvChange = () => {
      runtime.syncInventory(EngineInstance.variableStore.getAll().inventory);
    };

    const handleToast = ({ message }: any) => runtime.showToast(message);
    const handleOpenShop = ({ shopId }: any) => runtime.openShop(shopId);

    bus.on('node:enter', handleNodeEnter);
    bus.on('attribute:changed', handleAttrChange);
    bus.on('inventory:added', handleInvChange);
    bus.on('inventory:removed', handleInvChange);
    bus.on('ui:toast', handleToast);
    bus.on('ui:openShop', handleOpenShop);

    // Boot Engine
    EngineInstance.loadStory(story);
    // Sync initial state
    handleAttrChange(); 
    handleInvChange();
    
    EngineInstance.startSegment(story.activeSegmentId);

    return () => {
      bus.off('node:enter', handleNodeEnter);
      bus.off('attribute:changed', handleAttrChange);
      bus.off('inventory:added', handleInvChange);
      bus.off('inventory:removed', handleInvChange);
      bus.off('ui:toast', handleToast);
      bus.off('ui:openShop', handleOpenShop);
    };
  }, [runtime.isRunning]);

  if (!runtime.isRunning) return null;

  // -- Render Helpers --

  const currentNode = runtime.currentNode;
  const isLocation = currentNode?.type === NodeType.LOCATION;
  const isDialogue = currentNode?.type === NodeType.DIALOGUE;
  const isVote = currentNode?.type === NodeType.VOTE;

  // Find background image (persist last known location image if in dialogue)
  const bgImage = currentNode?.type === NodeType.LOCATION 
      ? (currentNode as LocationNode).backgroundImage 
      : ''; // Simple logic for MVP, ideally persist from last location

  const handleChoice = (choiceId?: string) => {
    EngineInstance.advance(choiceId);
  };

  const handleHotspotClick = (hotspotId: string) => {
      EngineInstance.triggerEvent('onClick', hotspotId);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black font-sans text-white overflow-hidden select-none">
      
      {/* 1. Background Layer */}
      <div className="absolute inset-0 bg-zinc-900">
        {bgImage && <img src={bgImage} className="w-full h-full object-cover opacity-80" alt="background" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />
      </div>

      {/* 2. HUD Layer */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
         {/* Attributes Bar */}
         <div className="flex gap-4 pointer-events-auto">
            {story.attributes.filter(a => a.type === 'number').map(attr => {
                const val = runtime.attributes[attr.id] ?? attr.defaultValue;
                const percent = attr.max ? (val / attr.max) * 100 : 100;
                
                // Icon mapping (simple heuristic)
                let Icon = Coins;
                let color = "text-yellow-400";
                let barColor = "bg-yellow-500";
                
                if (attr.key.includes('hp') || attr.key.includes('health')) { Icon = Heart; color = "text-red-400"; barColor = "bg-red-500"; }
                if (attr.key.includes('sanity') || attr.key.includes('mana')) { Icon = Brain; color = "text-blue-400"; barColor = "bg-blue-500"; }

                return (
                    <div key={attr.id} className="bg-black/60 backdrop-blur-md rounded-lg p-2 border border-white/10 flex flex-col gap-1 min-w-[100px]">
                        <div className="flex justify-between items-center text-xs">
                            <span className={`flex items-center gap-1 font-bold ${color}`}>
                                <Icon className="w-3 h-3" /> {attr.name}
                            </span>
                            <span className="font-mono">{val}</span>
                        </div>
                        {attr.max && (
                            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }} />
                            </div>
                        )}
                    </div>
                );
            })}
         </div>

         {/* System Menu */}
         <div className="flex gap-2 pointer-events-auto">
            <button 
                onClick={runtime.toggleInventory}
                className="p-2 bg-black/60 backdrop-blur hover:bg-white/20 rounded-full border border-white/10 transition-colors relative"
            >
                <Package className="w-5 h-5 text-amber-400" />
                {Object.keys(runtime.inventory).length > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-black"></span>
                )}
            </button>
            <button 
                onClick={() => runtime.setIsRunning(false)}
                className="p-2 bg-red-900/80 hover:bg-red-700 rounded-full border border-red-500/30 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* 3. Scene Interaction Layer (Hotspots) */}
      {isLocation && (
          <div className="absolute inset-0 pointer-events-none">
              {(currentNode as LocationNode).hotspots?.map(hs => (
                  <div 
                    key={hs.id}
                    onClick={() => handleHotspotClick(hs.id)}
                    className="absolute cursor-pointer pointer-events-auto group"
                    style={{
                        left: `${hs.rect.x}%`,
                        top: `${hs.rect.y}%`,
                        width: `${hs.rect.w}%`,
                        height: `${hs.rect.h}%`
                    }}
                  >
                      {/* Debug hint on hover, usually invisible */}
                      <div className="w-full h-full border-2 border-transparent group-hover:border-white/30 group-hover:bg-white/5 transition-all rounded-lg flex items-center justify-center">
                          {hs.name && <span className="text-[10px] bg-black/70 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{hs.name}</span>}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* 4. Dialogue / Vote / Interaction Layer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center justify-end pointer-events-none">
         
         {/* Toast Notifications */}
         <div className="mb-4 flex flex-col items-center gap-2 w-full">
            {runtime.toasts.map(t => (
                <div key={t.id} className="bg-black/80 text-white px-4 py-2 rounded-full border border-white/10 shadow-lg text-sm animate-in fade-in slide-in-from-bottom-4">
                    {t.message}
                </div>
            ))}
         </div>

         {/* Dialogue Box */}
         {isDialogue && (
             <div className="w-full max-w-3xl bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-6 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">
                 {/* Speaker */}
                 <div className="text-amber-400 font-bold text-lg mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {story.characters.find(c => c.id === (currentNode as DialogueNode).characterId)?.name || '???'}
                 </div>
                 
                 {/* Text */}
                 <div className="text-zinc-100 text-base leading-relaxed min-h-[60px]">
                    {(currentNode as DialogueNode).text}
                 </div>

                 {/* Choices */}
                 {(currentNode as DialogueNode).choices?.length > 0 ? (
                     <div className="flex flex-wrap gap-3 mt-6 justify-end">
                        {(currentNode as DialogueNode).choices.map(choice => (
                            <button 
                                key={choice.id}
                                onClick={() => handleChoice(choice.id)}
                                className="px-5 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg border border-indigo-400/30 transition-all transform hover:scale-105 active:scale-95 text-sm font-semibold"
                            >
                                {choice.text}
                            </button>
                        ))}
                     </div>
                 ) : (
                     // Click to continue arrow
                     <div className="flex justify-end mt-4">
                        <button onClick={() => handleChoice()} className="animate-bounce p-2 hover:bg-white/10 rounded-full">
                            <SkipForward className="w-5 h-5 text-zinc-400" />
                        </button>
                     </div>
                 )}
             </div>
         )}

         {/* Vote UI */}
         {isVote && (
             <div className="w-full max-w-2xl pointer-events-auto animate-in zoom-in-95 fade-in duration-300">
                 <div className="bg-violet-900/90 backdrop-blur-xl border border-violet-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-violet-900/50">
                     <h2 className="text-2xl font-bold text-white mb-6">{(currentNode as VoteNode).voteConfig.title}</h2>
                     
                     <div className="grid grid-cols-1 gap-4">
                        {(currentNode as VoteNode).voteConfig.options.map(opt => (
                            <button 
                                key={opt.id}
                                onClick={() => handleChoice(opt.id)}
                                className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-400 rounded-xl text-lg font-medium transition-all flex justify-between items-center group"
                            >
                                <span>{opt.text}</span>
                                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            </button>
                        ))}
                     </div>
                     
                     <div className="mt-6 w-full bg-black/30 h-1.5 rounded-full overflow-hidden">
                         <div className="h-full bg-violet-400 w-full animate-[shrink_15s_linear_forwards]" style={{ animationDuration: `${(currentNode as VoteNode).voteConfig.duration}s` }} />
                     </div>
                 </div>
             </div>
         )}
      </div>

      {/* 5. Inventory Modal */}
      {runtime.showInventory && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold flex items-center gap-2"><Package className="w-5 h-5 text-amber-500" /> 背包 (Inventory)</h3>
                      <button onClick={runtime.toggleInventory} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 grid grid-cols-4 gap-4 overflow-y-auto">
                      {Object.entries(runtime.inventory).map(([itemId, count]) => {
                          const item = story.items.find(i => i.id === itemId);
                          if (!item) return null;
                          return (
                              <div key={itemId} className="bg-black/40 border border-zinc-700 rounded-lg p-3 flex flex-col items-center gap-2 hover:border-amber-500/50 transition-colors">
                                  <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center text-2xl">
                                      {item.icon ? <img src={item.icon} className="w-full h-full object-cover rounded" alt={item.name} /> : '📦'}
                                  </div>
                                  <div className="text-center">
                                      <div className="text-xs font-bold text-zinc-300 truncate w-full">{item.name}</div>
                                      <div className="text-[10px] text-zinc-500">Qty: {count}</div>
                                  </div>
                              </div>
                          );
                      })}
                      {Object.keys(runtime.inventory).length === 0 && (
                          <div className="col-span-4 text-center text-zinc-500 py-10 italic">背包空空如也...</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* 6. Shop Modal */}
      {runtime.activeShopId && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                {(() => {
                    const shop = story.shops?.find(s => s.id === runtime.activeShopId);
                    if (!shop) return <div className="p-4">Shop not found</div>;
                    
                    return (
                        <>
                          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                              <div>
                                  <h3 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-500" /> {shop.name}</h3>
                                  <p className="text-xs text-zinc-500">{shop.description}</p>
                              </div>
                              <button onClick={runtime.closeShop} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                          </div>
                          <div className="p-6 grid grid-cols-1 gap-3 overflow-y-auto">
                              {shop.inventory.map((shopItem) => {
                                  const itemDef = story.items.find(i => i.id === shopItem.itemId);
                                  const playerMoney = runtime.attributes[shopItem.currencyAttributeId] ?? 0;
                                  const canAfford = playerMoney >= shopItem.price;
                                  
                                  const buy = () => {
                                      if (!canAfford) {
                                          runtime.showToast("资金不足 (Not enough currency)");
                                          return;
                                      }
                                      EngineInstance.variableStore.modifyAttribute(shopItem.currencyAttributeId, 'sub', shopItem.price);
                                      EngineInstance.variableStore.addItem(shopItem.itemId, 1);
                                      runtime.showToast(`购买了 ${itemDef?.name || '物品'}`);
                                  };

                                  if (!itemDef) return null;

                                  return (
                                      <div key={shopItem.itemId} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-zinc-800">
                                          <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center">
                                                  {itemDef.icon ? <img src={itemDef.icon} className="w-full h-full object-cover rounded" alt={itemDef.name} /> : '🎁'}
                                              </div>
                                              <div>
                                                  <div className="text-sm font-bold text-zinc-200">{itemDef.name}</div>
                                                  <div className="text-xs text-zinc-500">Price: {shopItem.price}</div>
                                              </div>
                                          </div>
                                          <button 
                                              onClick={buy}
                                              disabled={!canAfford}
                                              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                                                  canAfford 
                                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                              }`}
                                          >
                                              购买
                                          </button>
                                      </div>
                                  );
                              })}
                              {shop.inventory.length === 0 && (
                                  <div className="text-center text-zinc-500 py-8">暂无商品上架</div>
                              )}
                          </div>
                        </>
                    );
                })()}
              </div>
          </div>
      )}
    </div>
  );
};

export default GameOverlay;