import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameEngineState, ShopItem } from '../types/schema';
import { TOWN_SHOP_ITEMS } from '../data/shopData';
import { 
  ShoppingBag, 
  Coins, 
  Lock, 
  Unlock, 
  X, 
  Shield, 
  Sparkles, 
  Heart, 
  Zap, 
  Crosshair, 
  Sun, 
  Skull, 
  Footprints, 
  Flame, 
  Check, 
  Info,
  ArrowRight
} from 'lucide-react';

interface TownShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameEngineState;
  onBuyItem: (itemId: string, heroId: string) => boolean;
}

export const TownShopModal: React.FC<TownShopModalProps> = ({
  isOpen,
  onClose,
  state,
  onBuyItem
}) => {
  const heroes = state?.heroes || [];
  const [activeCategory, setActiveCategory] = useState<'all' | 'weapon' | 'armor' | 'relic' | 'consumable'>('all');
  const [selectedHeroId, setSelectedHeroId] = useState<string>(heroes[0]?.id || '');
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);

  if (!isOpen || !state) return null;

  const isAccessible = !!state.canAccessShop;
  const filteredItems = TOWN_SHOP_ITEMS.filter(item => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const selectedHero = heroes.find(h => h.id === selectedHeroId) || heroes[0];

  const handleBuy = (item: ShopItem) => {
    if (!isAccessible || !selectedHero) return;
    const success = onBuyItem(item.id, selectedHero.id);
    if (success) {
      setPurchaseNotice(`Purchased ${item.name} for ${selectedHero.name}!`);
      setTimeout(() => setPurchaseNotice(null), 3000);
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Crosshair': return <Crosshair className="w-4 h-4 text-emerald-400" />;
      case 'Zap': return <Zap className="w-4 h-4 text-blue-400" />;
      case 'Sun': return <Sun className="w-4 h-4 text-amber-300" />;
      case 'Skull': return <Skull className="w-4 h-4 text-purple-400" />;
      case 'Shield': return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-pink-300" />;
      case 'Heart': return <Heart className="w-4 h-4 text-red-400" />;
      case 'Footprints': return <Footprints className="w-4 h-4 text-lime-400" />;
      default: return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'epic': return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'rare': return 'bg-blue-950/80 text-blue-300 border-blue-700/60';
      case 'legendary': return 'bg-amber-950/80 text-amber-300 border-amber-500/80';
      default: return 'bg-stone-800 text-stone-300 border-stone-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-stone-950 via-amber-950/30 to-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-amber-200 font-serif tracking-wide flex items-center gap-2">
                Town Outfitter & Alchemist Emporium
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                Exchange looted dungeon gold for battle-forged weapons, reinforced armor, and mystic draughts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Party Gold Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-900 border border-amber-500/40 text-amber-300 font-mono text-sm font-bold shadow-inner">
              <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{state.partyGold} GP</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shop Access Banner & Rules Enforcement */}
        <div className="px-5 py-2.5 border-b border-stone-800 shrink-0">
          {isAccessible ? (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>🏆 Boss Mandate Fulfilled:</strong> The Module Boss has been vanquished! The passage to the surface town is secured. Your earned module rewards are available to spend!
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-900/60 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-200 shrink-0">
                Shop Unlocked
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>🔒 Mandate: Defeat the Module Boss to Unlock Shop:</strong> Town merchants cannot trade while the dungeon boss remains undefeated! Slay the boss to claim the module victory bounty (+350 GP) and open the shop.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-900/60 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 shrink-0">
                Slay Boss to Unlock
              </span>
            </div>
          )}

          {/* Temporary feedback notification */}
          {purchaseNotice && (
            <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-medium">
              <Check className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{purchaseNotice}</span>
            </div>
          )}
        </div>

        {/* Roster Target Selector & Category Filter Header */}
        <div className="px-5 py-3 bg-stone-900/60 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Target Hero Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-mono uppercase tracking-wider">Recipient:</span>
            <div className="flex items-center gap-1.5">
              {heroes.map((hero) => {
                const isSelected = hero.id === selectedHeroId;
                return (
                  <button
                    key={hero.id}
                    onClick={() => setSelectedHeroId(hero.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-950 text-amber-200 border-amber-500 shadow-sm'
                        : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: hero.color }}
                    />
                    <span>{hero.name}</span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      (AC {hero.ac} • {hero.hp}/{hero.maxHp} HP)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
            {(['all', 'weapon', 'armor', 'relic', 'consumable'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {cat === 'all' ? 'All Wares' : cat === 'weapon' ? 'Weapons' : cat === 'armor' ? 'Armor & Shields' : cat === 'relic' ? 'Relics' : 'Potions'}
              </button>
            ))}
          </div>
        </div>

        {/* Goods Catalogue Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const canAfford = state.partyGold >= item.cost;
            const matchesClass = item.targetClass === 'all' || item.targetClass === selectedHero?.classType;

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                  canAfford && isAccessible
                    ? 'bg-stone-900/80 hover:bg-stone-900 border-stone-800 hover:border-amber-500/40 shadow-sm'
                    : 'bg-stone-950/60 border-stone-800/80 opacity-80'
                }`}
              >
                <div>
                  {/* Item Header: Icon, Name, Rarity & Price */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0">
                        {renderIcon(item.icon)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-100 leading-tight">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${getRarityBadge(item.rarity)}`}>
                            {item.rarity}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400 capitalize">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cost Badge */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-950 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold shrink-0">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>{item.cost} GP</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-stone-300 mb-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Stat / Upgrade Callouts */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.weaponUpgrade && (
                      <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800/60 text-red-300 font-mono text-[10px]">
                        ⚔️ {item.weaponUpgrade.damageDice} {item.weaponUpgrade.damageType} (Range {item.weaponUpgrade.range})
                      </span>
                    )}
                    {item.statBonus?.ac && (
                      <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300 font-mono text-[10px]">
                        🛡️ +{item.statBonus.ac} AC
                      </span>
                    )}
                    {item.statBonus?.speed && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-mono text-[10px]">
                        💨 +{item.statBonus.speed} Speed
                      </span>
                    )}
                    {item.statBonus?.maxHp && (
                      <span className="px-2 py-0.5 rounded bg-pink-950/60 border border-pink-800/60 text-pink-300 font-mono text-[10px]">
                        ❤️ +{item.statBonus.maxHp} Max HP
                      </span>
                    )}
                    {item.targetClass && item.targetClass !== 'all' && (
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono capitalize ${
                        matchesClass
                          ? 'bg-amber-950/40 border-amber-700/60 text-amber-300'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}>
                        Class: {item.targetClass}
                      </span>
                    )}
                  </div>
                </div>

                {/* Purchase Action Button */}
                <button
                  disabled={!isAccessible || !canAfford}
                  onClick={() => handleBuy(item)}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    !isAccessible
                      ? 'bg-stone-900 border border-stone-800 text-stone-400 cursor-not-allowed'
                      : !canAfford
                      ? 'bg-stone-900 border border-red-900/40 text-red-400 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30 cursor-pointer'
                  }`}
                >
                  {!isAccessible ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Shop Inaccessible in Dungeon</span>
                    </>
                  ) : !canAfford ? (
                    <>
                      <Coins className="w-3.5 h-3.5 text-red-400" />
                      <span>Need {item.cost - state.partyGold} More GP</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Purchase for {selectedHero.name}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-400" />
            <span>
              Gold collected across dungeon runs is retained between sessions as persistent campaign progression.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 font-semibold border border-stone-800 cursor-pointer transition-colors"
          >
            Close Shop
          </button>
        </div>
      </motion.div>
    </div>
  );
};
