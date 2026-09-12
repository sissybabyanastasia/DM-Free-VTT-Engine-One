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
  Wrench,
  FlaskConical
} from 'lucide-react';

interface ActionBarProps {
  state: GameEngineState;
  onSelectHero: (heroId: string) => void;
  onSelectAction: (action: 'move' | 'attack' | 'ability' | 'interact' | null, abilityId?: string) => void;
  onExecuteAttack: (monsterId: string, weaponIndex: number) => void;
  onExecuteAbility: (ability: ClassAbility) => void;
  onExecuteInteract: (type: 'chest' | 'trap' | 'pillar' | 'potion' | 'door') => void;
  onEndPartyTurn: () => void;
  onPassTurn?: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  state,
  onSelectHero,
  onSelectAction,
  onExecuteAttack,
  onExecuteAbility,
  onExecuteInteract,
  onEndPartyTurn,
  onPassTurn
}) => {
  const activeHero = state.heroes[state.activeHeroIndex];
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);

  const livingMonsters = state.activeRooms.flatMap(r => r.monsters).filter(m => m.isAlive);
  const isHeroTurn = state.turnPhase === 'HERO_TURN';

  if (!activeHero) return null;

  const hasMoved = activeHero.turnState.hasMoved || activeHero.turnState.moveRemaining <= 0;
  const hasActed = activeHero.turnState.hasActed || activeHero.turnState.actionsRemaining <= 0;
  const hasInteracted = activeHero.turnState.hasInteracted || activeHero.turnState.interactsRemaining <= 0;

  return (
    <div className="w-full bg-stone-900 border-t border-stone-800 p-3 shadow-2xl flex flex-col gap-3">
      {/* Top Row: Cooperative Party Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-mono mr-1">
            Party:
          </span>
          {state.heroes.map((hero) => {
            const isSelected = hero.id === activeHero.id;
            const isDead = hero.hp <= 0;
            return (
              <button
                key={hero.id}
                id={`hero-tab-${hero.id}`}
                onClick={() => onSelectHero(hero.id)}
                disabled={!isHeroTurn}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected 
                    ? 'bg-stone-800 text-amber-300 ring-2 ring-amber-500 shadow-md' 
                    : isDead
                      ? 'bg-stone-950/60 text-stone-600 line-through'
                      : 'bg-stone-950/80 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span className="text-sm">{hero.portrait}</span>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{hero.name}</span>
                    {hero.turnState.statusEffects.map(se => (
                      <span 
                        key={se.id} 
                        className="text-[8px] px-1 py-0.2 rounded bg-red-950 border border-red-700 text-red-300 font-bold uppercase tracking-tight"
                        title={`${se.name}: ${se.description}`}
                      >
                        {se.name}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    HP {hero.hp}/{hero.maxHp} | AC {hero.ac}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Turn Engine State & End Party Turn Button */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-stone-400">
              Round {state.currentRound}
            </div>
            <div className="text-xs font-bold text-amber-400 uppercase">
              {state.turnPhase === 'HERO_TURN' ? 'Cooperative Action Phase' : 'Monster AI Phase'}
            </div>
          </div>

          <button
            id="btn-end-party-turn"
            onClick={onEndPartyTurn}
            disabled={!isHeroTurn || state.isGameOver || state.isVictory}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
              isHeroTurn
                ? 'bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-600 hover:to-amber-600 text-stone-100 shadow-red-950/50 hover:shadow-red-900/50'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>End Party Turn (AI Phase)</span>
          </button>
        </div>
      </div>

      {/* Middle Row: Active Hero Action Pools & Command Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Turn Resource Meters */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded border ${
            hasMoved ? 'bg-stone-950 border-stone-800 text-stone-500' : 'bg-stone-950 border-emerald-900/60'
          }`}>
            <Footprints className={`w-3.5 h-3.5 ${hasMoved ? 'text-stone-500' : 'text-emerald-400'}`} />
            <span className="text-stone-300">Move:</span>
            <span className={`font-bold ${hasMoved ? 'text-stone-400' : 'text-emerald-400'}`}>
              {hasMoved ? 'Locked (1/1)' : `${activeHero.turnState.moveRemaining}/${activeHero.turnState.maxMove}`}
            </span>
          </div>

          <div className={`flex items-center gap-1 px-2.5 py-1 rounded border ${
            hasActed ? 'bg-stone-950 border-stone-800 text-stone-500' : 'bg-stone-950 border-blue-900/60'
          }`}>
            <Sword className={`w-3.5 h-3.5 ${hasActed ? 'text-stone-500' : 'text-blue-400'}`} />
            <span className="text-stone-300">Action:</span>
            <span className={`font-bold ${hasActed ? 'text-stone-400' : 'text-blue-400'}`}>
              {hasActed ? 'Done (1/1)' : '1/1'}
            </span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 bg-stone-950 rounded border border-stone-800">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-stone-300">Bonus:</span>
            <span className="font-bold text-purple-400">
              {activeHero.turnState.bonusActionsRemaining}/1
            </span>
          </div>

          <div className={`flex items-center gap-1 px-2.5 py-1 rounded border ${
            hasInteracted ? 'bg-stone-950 border-stone-800 text-stone-500' : 'bg-stone-950 border-amber-900/60'
          }`}>
            <Key className={`w-3.5 h-3.5 ${hasInteracted ? 'text-stone-500' : 'text-amber-400'}`} />
            <span className="text-stone-300">Interact:</span>
            <span className={`font-bold ${hasInteracted ? 'text-stone-400' : 'text-amber-400'}`}>
              {hasInteracted ? 'Done (1/1)' : '1/1'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Attack Action with Weapon Selection */}
          {(() => {
            const currentWeapon = activeHero.weapons[selectedWeaponIdx] || activeHero.weapons[0];
            const targetsInRange = livingMonsters
              .filter(m => distance(activeHero.position, m.position) <= currentWeapon.range)
              .sort((a, b) => distance(activeHero.position, a.position) - distance(activeHero.position, b.position));
            const hasTarget = targetsInRange.length > 0;
            const nearestEnemy = livingMonsters
              .map(m => ({ name: m.name, dist: distance(activeHero.position, m.position) }))
              .sort((a, b) => a.dist - b.dist)[0];
            const canAttackWithWeapon = !hasActed && isHeroTurn && hasTarget;

            return (
              <div className="flex items-center bg-stone-950 border border-stone-800 rounded-lg p-0.5">
                <select
                  value={selectedWeaponIdx}
                  onChange={(e) => setSelectedWeaponIdx(parseInt(e.target.value, 10))}
                  className="bg-stone-900 text-stone-200 text-xs px-2 py-1.5 rounded border-none outline-none font-sans"
                  title="Select equipped weapon"
                >
                  {activeHero.weapons.map((w, idx) => (
                    <option key={w.id} value={idx}>
                      {w.name} (+{w.attackBonus}, {w.damageDice}, R:{w.range})
                    </option>
                  ))}
                </select>

                <button
                  id="btn-attack-action"
                  onClick={() => {
                    if (canAttackWithWeapon) {
                      onExecuteAttack(targetsInRange[0].id, selectedWeaponIdx);
                    }
                  }}
                  disabled={!canAttackWithWeapon}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ml-1 ${
                    canAttackWithWeapon
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-800'
                  }`}
                  title={
                    hasActed 
                      ? 'Combat action already expended for this turn.'
                      : hasTarget
                      ? `Attack ${targetsInRange[0].name} with ${currentWeapon.name} (Reach: ${distance(activeHero.position, targetsInRange[0].position)}/${currentWeapon.range} sq)`
                      : nearestEnemy
                      ? `Out of range! Nearest foe (${nearestEnemy.name}) is ${nearestEnemy.dist} sq away (${currentWeapon.name} reach: ${currentWeapon.range} sq). Move closer to attack!`
                      : 'No living monsters detected.'
                  }
                >
                  <Sword className="w-3.5 h-3.5" />
                  <span>
                    {hasTarget
                      ? `Attack ${targetsInRange[0].name.split(' ')[0]}`
                      : hasActed
                      ? 'Action Expended'
                      : 'Out of Reach'}
                  </span>
                </button>
              </div>
            );
          })()}

          {/* Class Abilities */}
          {activeHero.abilities.map((ability) => {
            const canUse = (ability.actionCost === 'action' && !hasActed) ||
                           (ability.actionCost === 'bonus' && activeHero.turnState.bonusActionsRemaining > 0);
            const onCooldown = ability.currentCooldown > 0;

            return (
              <button
                key={ability.id}
                id={`btn-ability-${ability.id}`}
                onClick={() => onExecuteAbility(ability)}
                disabled={!canUse || onCooldown}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  canUse && !onCooldown
                    ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-md'
                    : 'bg-stone-950 text-stone-600 border border-stone-800 cursor-not-allowed'
                }`}
                title={`${ability.description} [Cost: ${ability.actionCost}]`}
              >
                {ability.healAmount ? <Heart className="w-3.5 h-3.5 text-emerald-400" /> : <Flame className="w-3.5 h-3.5 text-amber-400" />}
                <span>{ability.name}</span>
                {onCooldown && <span className="text-[10px] font-mono text-stone-500">({ability.currentCooldown} cd)</span>}
              </button>
            );
          })}

          {/* Quick Interact: Potion */}
          {activeHero.inventory.some(i => i.type === 'consumable') && (
            <button
              id="btn-drink-potion"
              onClick={() => onExecuteInteract('potion')}
              disabled={activeHero.turnState.interactsRemaining <= 0}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeHero.turnState.interactsRemaining > 0
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  : 'bg-stone-900 text-stone-600 cursor-not-allowed'
              }`}
              title="Drink healing potion (Interact Action)"
            >
              <FlaskConical className="w-3.5 h-3.5 text-emerald-300" />
              <span>Drink Potion</span>
            </button>
          )}

          {/* Quick Interact: Chest / Pillar / Object */}
          <button
            id="btn-quick-interact"
            onClick={() => onExecuteInteract('chest')}
            disabled={activeHero.turnState.interactsRemaining <= 0}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeHero.turnState.interactsRemaining > 0
                ? 'bg-amber-700 hover:bg-amber-600 text-stone-100'
                : 'bg-stone-900 text-stone-600 cursor-not-allowed'
            }`}
            title="Interact with adjacent chest, doorway, or boss pillar"
          >
            <Key className="w-3.5 h-3.5 text-amber-300" />
            <span>Interact</span>
          </button>
        </div>
      </div>
    </div>
  );
};
