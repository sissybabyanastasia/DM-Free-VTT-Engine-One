import React, { useState } from 'react';
import { GameEngineState, ClassAbility, WeaponAttack } from '../types/schema';
import { distance } from '../engine/monsterAI';
import { 
  Shield, 
  Sword, 
  Zap, 
  Sparkles, 
  Footprints, 
  Heart, 
  Play, 
  Crosshair, 
  Flame, 
  Key, 
  FlaskConical,
  Lock,
  CheckCircle2,
  SkipForward,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Skull
} from 'lucide-react';

interface TacticalSidebarProps {
  state: GameEngineState;
  onSelectHero: (heroId: string) => void;
  onSelectAction: (action: 'move' | 'attack' | 'ability' | 'interact' | null, abilityId?: string) => void;
  onExecuteAttack: (monsterId: string, weaponIndex: number) => void;
  onExecuteAbility: (ability: ClassAbility) => void;
  onExecuteInteract: (type: 'chest' | 'trap' | 'pillar' | 'potion' | 'door', id?: string) => void;
  onSkipMove: () => void;
  onPassTurn: () => void;
  onEndPartyTurn: () => void;
  onDismissNotice: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const TacticalSidebar: React.FC<TacticalSidebarProps> = ({
  state,
  onSelectHero,
  onSelectAction,
  onExecuteAttack,
  onExecuteAbility,
  onExecuteInteract,
  onSkipMove,
  onPassTurn,
  onEndPartyTurn,
  onDismissNotice,
  isOpen,
  onToggle
}) => {
  const activeHero = state.heroes[state.activeHeroIndex];
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);

  const livingMonsters = state.activeRooms.flatMap(r => r.monsters).filter(m => m.isAlive);
  const isHeroTurn = state.turnPhase === 'HERO_TURN';

  if (!activeHero) return null;

  const hasMoved = activeHero.turnState.hasMoved || activeHero.turnState.moveRemaining <= 0;
  const hasActed = activeHero.turnState.hasActed || activeHero.turnState.actionsRemaining <= 0;
  const hasInteracted = activeHero.turnState.hasInteracted || activeHero.turnState.interactsRemaining <= 0;
  const isAllActionsCompleted = hasMoved && hasActed && hasInteracted;

  const nextHeroCandidate = state.initiativeList?.find(
    (item) => item.type === 'hero' && !item.isDone && item.isAlive && item.id !== activeHero.id
  );

  return (
    <aside 
      className={`h-full flex flex-col bg-stone-950 border-l border-stone-800 shadow-2xl transition-all duration-300 relative z-20 ${
        isOpen ? 'w-80 md:w-92 shrink-0' : 'w-0 overflow-hidden border-l-0'
      }`}
    >
      {/* Sidebar Header: Cooperative Phase & Round */}
      <div className="p-3 bg-stone-900 border-b border-stone-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold text-xs uppercase tracking-wider text-amber-300 font-mono">
              {state.turnPhase === 'HERO_TURN' ? 'Cooperative Action Phase' : 'Monster AI Phase'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-stone-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
            <span>Round {state.currentRound}</span>
          </div>
        </div>

        {/* End Party Turn Button */}
        <button
          id="btn-sidebar-end-party-turn"
          onClick={onEndPartyTurn}
          disabled={!isHeroTurn || state.isGameOver || state.isVictory}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
            isHeroTurn
              ? 'bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-600 hover:to-amber-600 text-stone-100 shadow-red-950/50 hover:shadow-red-900/50 cursor-pointer'
              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>End Party Turn (AI Phase)</span>
        </button>
      </div>

      {/* Turn Alert / Notice (Pit Interruption, Warnings) */}
      {state.turnNotice && (
        <div className="mx-3 mt-2.5 p-2 bg-amber-950/80 border border-amber-600/70 text-amber-200 rounded-lg text-xs flex items-start justify-between gap-2 shrink-0 animate-fadeIn">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{state.turnNotice}</span>
          </div>
          <button 
            onClick={onDismissNotice}
            className="text-amber-400 hover:text-white p-0.5 rounded hover:bg-amber-900/50 shrink-0"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scrollable Tactical Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
        {/* Section 1: Initiative Order Queue */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Initiative Order</span>
            </div>
            <button
              id="btn-sidebar-pass-turn"
              onClick={onPassTurn}
              disabled={!isHeroTurn || state.isGameOver || state.isVictory}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                isAllActionsCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
              }`}
              title="Pass turn to next hero"
            >
              <SkipForward className="w-3 h-3" />
              <span>{nextHeroCandidate ? `Pass ➔ ${nextHeroCandidate.name.split(' ')[0]}` : 'Pass'}</span>
            </button>
          </div>

          {/* Initiative Chips Stream */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {state.initiativeList?.map((member, index) => {
              const isCurrent = member.id === activeHero.id && isHeroTurn;
              const isHero = member.type === 'hero';

              return (
                <button
                  key={member.id}
                  id={`initiative-chip-${member.id}`}
                  onClick={() => isHero && onSelectHero(member.id)}
                  disabled={!isHero}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-all shrink-0 border ${
                    isCurrent
                      ? 'bg-amber-950 border-amber-500 text-amber-200 ring-2 ring-amber-500/50 shadow-md'
                      : member.isDone
                        ? 'bg-stone-900 border-stone-800 text-stone-500'
                        : !member.isAlive
                          ? 'bg-stone-900/60 border-stone-900 text-stone-600 line-through'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                  }`}
                  title={`${member.name} (Initiative ${member.initiative})`}
                >
                  <span>{member.portrait}</span>
                  <span className="font-semibold">{member.name.split(' ')[0]}</span>
                  <span className="text-[9px] text-stone-500">[{member.initiative}]</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Party Members Roster */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            <span>Party Roster</span>
            <span className="text-[10px] text-stone-500">Click to Select</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {state.heroes.map((hero) => {
              const isSelected = hero.id === activeHero.id;
              const isDead = hero.hp <= 0;

              return (
                <button
                  key={hero.id}
                  id={`sidebar-hero-${hero.id}`}
                  onClick={() => onSelectHero(hero.id)}
                  disabled={!isHeroTurn}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
                    isSelected 
                      ? 'bg-stone-900 border-amber-500 text-amber-200 ring-1 ring-amber-500/60 shadow-md' 
                      : isDead
                        ? 'bg-stone-950/60 border-stone-900 text-stone-600'
                        : 'bg-stone-900/70 border-stone-800 text-stone-300 hover:bg-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 border"
                      style={{ borderColor: hero.color, backgroundColor: `${hero.color}22` }}
                    >
                      {hero.portrait}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate">{hero.name}</span>
                        {isSelected && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500 text-stone-950 font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono">
                        <span>HP {hero.hp}/{hero.maxHp}</span>
                        <span>•</span>
                        <span>AC {hero.ac}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-semibold">({hero.position.x}, {hero.position.y})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Status Effects & Health Bar */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {/* Status Effect Badges */}
                    {hero.turnState.statusEffects.map(se => (
                      <span 
                        key={se.id} 
                        className="text-[8px] px-1.5 py-0.2 rounded bg-red-950 border border-red-700 text-red-300 font-bold uppercase tracking-tight animate-pulse"
                        title={`${se.name}: ${se.description}`}
                      >
                        ⚠️ {se.name}
                      </span>
                    ))}

                    {/* Mini Health Bar */}
                    <div className="w-16 h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                      <div 
                        className={`h-full transition-all ${
                          hero.hp / hero.maxHp > 0.5 
                            ? 'bg-emerald-500' 
                            : hero.hp / hero.maxHp > 0.25 
                              ? 'bg-amber-500' 
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100))}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Active Hero Turn Actions & Guidance */}
        <div className="space-y-2 pt-1 border-t border-stone-800/80">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              {activeHero.name}'s Actions
            </span>
            <div className="flex items-center gap-2 font-mono text-[10px] text-stone-400">
              <span className={hasMoved ? 'text-stone-500' : 'text-emerald-400'}>Move {hasMoved ? '0' : activeHero.turnState.moveRemaining}</span>
              <span>•</span>
              <span className={hasActed ? 'text-stone-500' : 'text-blue-400'}>Action {hasActed ? '0' : '1'}</span>
              <span>•</span>
              <span className={hasInteracted ? 'text-stone-500' : 'text-amber-400'}>Interact {hasInteracted ? '0' : '1'}</span>
            </div>
          </div>

          {/* Action 1: Movement */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            hasMoved 
              ? 'bg-stone-900/40 border-stone-800/60 opacity-80' 
              : 'bg-stone-900/90 border-emerald-500/50 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-300">
                <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Move ({activeHero.turnState.moveRemaining}/{activeHero.turnState.maxMove} sq)</span>
              </div>
              {hasMoved ? (
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Locked
                </span>
              ) : (
                <button
                  id="btn-sidebar-skip-move"
                  onClick={onSkipMove}
                  className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] rounded border border-stone-700 flex items-center gap-1"
                  title="Lock movement"
                >
                  <Lock className="w-2.5 h-2.5 text-stone-400" />
                  <span>Hold</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-400 leading-tight">
              {hasMoved ? 'Movement resolved for this turn.' : 'Click any highlighted green tile on map.'}
            </p>
          </div>

          {/* Action 2: Combat Action & Attacks */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            hasActed 
              ? 'bg-stone-900/40 border-stone-800/60 opacity-80' 
              : 'bg-stone-900/90 border-blue-500/50 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-blue-300">
                <Sword className="w-3.5 h-3.5 text-blue-400" />
                <span>2. Combat Action</span>
              </div>
              {hasActed ? (
                <span className="text-[9px] font-mono text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              ) : (
                <span className="text-[9px] font-mono text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                  Ready
                </span>
              )}
            </div>

            {/* Weapon Selector & Attack Button */}
            {(() => {
              const currentWeapon = activeHero.weapons[selectedWeaponIdx] || activeHero.weapons[0];
              const targetsInRange = livingMonsters
                .filter(m => distance(activeHero.position, m.position) <= currentWeapon.range)
                .sort((a, b) => distance(activeHero.position, a.position) - distance(activeHero.position, b.position));
              const hasTarget = targetsInRange.length > 0;
              const canAttack = !hasActed && isHeroTurn && hasTarget;

              return (
                <div className="space-y-1.5 mb-2">
                  <select
                    value={selectedWeaponIdx}
                    onChange={(e) => setSelectedWeaponIdx(parseInt(e.target.value, 10))}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs px-2 py-1 rounded outline-none"
                    title="Select weapon"
                  >
                    {activeHero.weapons.map((w, idx) => (
                      <option key={w.id} value={idx}>
                        {w.name} (+{w.attackBonus}, {w.damageDice}, Reach {w.range})
                      </option>
                    ))}
                  </select>

                  <button
                    id="btn-sidebar-attack"
                    onClick={() => {
                      if (canAttack) {
                        onExecuteAttack(targetsInRange[0].id, selectedWeaponIdx);
                      }
                    }}
                    disabled={!canAttack}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      canAttack
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-800'
                    }`}
                  >
                    <Sword className="w-3.5 h-3.5" />
                    <span>
                      {hasTarget
                        ? `Attack ${targetsInRange[0].name.split(' ')[0]} (${currentWeapon.damageDice})`
                        : hasActed
                          ? 'Action Expended'
                          : 'Foe Out of Reach'}
                    </span>
                  </button>
                </div>
              );
            })()}

            {/* Class Abilities */}
            <div className="space-y-1 pt-1 border-t border-stone-800/60">
              <span className="text-[10px] font-mono text-stone-400 uppercase">Abilities</span>
              <div className="grid grid-cols-1 gap-1">
                {activeHero.abilities.map((ability) => {
                  const canUse = (ability.actionCost === 'action' && !hasActed) ||
                                 (ability.actionCost === 'bonus' && activeHero.turnState.bonusActionsRemaining > 0);
                  const onCooldown = ability.currentCooldown > 0;

                  return (
                    <button
                      key={ability.id}
                      id={`btn-sidebar-ability-${ability.id}`}
                      onClick={() => onExecuteAbility(ability)}
                      disabled={!canUse || onCooldown}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        canUse && !onCooldown
                          ? 'bg-purple-800/80 hover:bg-purple-700 text-purple-100 border border-purple-600/50 shadow-sm cursor-pointer'
                          : 'bg-stone-950 text-stone-600 border border-stone-800 cursor-not-allowed'
                      }`}
                      title={`${ability.description} [Cost: ${ability.actionCost}]`}
                    >
                      <div className="flex items-center gap-1.5">
                        {ability.healAmount ? <Heart className="w-3.5 h-3.5 text-emerald-400" /> : <Flame className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{ability.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400">
                        {onCooldown ? `${ability.currentCooldown} cd` : ability.actionCost}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action 3: Interaction */}
          <div className={`p-2.5 rounded-lg border transition-all ${
            hasInteracted 
              ? 'bg-stone-900/40 border-stone-800/60 opacity-80' 
              : 'bg-stone-900/90 border-amber-500/50 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Interact Action</span>
              </div>
              {hasInteracted ? (
                <span className="text-[9px] font-mono text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              ) : (
                <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                  Ready
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Potion Button */}
              {activeHero.inventory.some(i => i.type === 'consumable') && (
                <button
                  id="btn-sidebar-potion"
                  onClick={() => onExecuteInteract('potion')}
                  disabled={activeHero.turnState.interactsRemaining <= 0}
                  className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeHero.turnState.interactsRemaining > 0
                      ? 'bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer'
                      : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Drink Potion</span>
                </button>
              )}

              {/* Chest / Object Button */}
              <button
                id="btn-sidebar-interact"
                onClick={() => onExecuteInteract('chest')}
                disabled={activeHero.turnState.interactsRemaining <= 0}
                className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeHero.turnState.interactsRemaining > 0
                    ? 'bg-amber-700 hover:bg-amber-600 text-stone-100 cursor-pointer'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-amber-300" />
                <span>Interact</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
