import React from 'react';
import { GameEngineState, ClassAbility } from '../types/schema';
import { 
  Footprints, 
  Sword, 
  Key, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  AlertCircle, 
  X, 
  Flame, 
  FlaskConical, 
  ShieldAlert, 
  SkipForward,
  UserCheck,
  DoorOpen,
  Sparkles
} from 'lucide-react';

interface TurnManagementControllerProps {
  state: GameEngineState;
  onSelectHero: (heroId: string) => void;
  onSkipMove: () => void;
  onSkipAction: () => void;
  onSkipInteract: () => void;
  onPassTurn: () => void;
  onExecuteAttack: (monsterId: string, weaponIndex: number) => void;
  onExecuteInteract: (type: 'chest' | 'trap' | 'pillar' | 'potion' | 'door' | 'cell' | 'treasure_hoard', id?: string) => void;
  onDismissNotice: () => void;
}

export const TurnManagementController: React.FC<TurnManagementControllerProps> = ({
  state,
  onSelectHero,
  onSkipMove,
  onSkipAction,
  onSkipInteract,
  onPassTurn,
  onExecuteAttack,
  onExecuteInteract,
  onDismissNotice
}) => {
  const activeHero = state.heroes[state.activeHeroIndex];
  const isHeroTurn = state.turnPhase === 'HERO_TURN';
  const prompt = state.turnPrompt;

  if (!activeHero) return null;

  const hasMoved = activeHero.turnState.hasMoved || activeHero.turnState.moveRemaining <= 0;
  const hasActed = activeHero.turnState.hasActed || activeHero.turnState.actionsRemaining <= 0;
  const hasInteracted = activeHero.turnState.hasInteracted || activeHero.turnState.interactsRemaining <= 0;
  const isAllActionsCompleted = hasMoved && hasActed && hasInteracted;

  const nextHeroCandidate = state.initiativeList?.find(
    (item) => item.type === 'hero' && !item.isDone && item.isAlive && item.id !== activeHero.id
  );

  return (
    <div className="w-full bg-stone-900 border-b border-stone-800 p-2.5 shadow-md flex flex-col gap-2 font-sans">
      {/* Initiative Lock / Out of Order Notice Alert */}
      {state.turnNotice && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-950/80 border border-amber-600/70 text-amber-200 rounded-lg text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{state.turnNotice}</span>
          </div>
          <button 
            onClick={onDismissNotice}
            className="p-1 text-amber-400 hover:text-amber-100 hover:bg-amber-900/50 rounded transition-all"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Row 1: Initiative Queue & Turn Order Controller */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 font-mono uppercase tracking-wider shrink-0 mr-1">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Initiative Order:</span>
          </div>

          {state.initiativeList?.map((member, index) => {
            const isCurrent = member.id === activeHero.id && isHeroTurn;
            const isHero = member.type === 'hero';

            return (
              <button
                key={member.id}
                id={`initiative-order-${member.id}`}
                onClick={() => isHero && onSelectHero(member.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all shrink-0 border ${
                  isCurrent
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-2 ring-amber-500/60 shadow-lg shadow-amber-950/40'
                    : member.isDone
                      ? 'bg-stone-950/60 border-stone-800 text-stone-400'
                      : !member.isAlive
                        ? 'bg-stone-950/40 border-stone-900 text-stone-600 line-through'
                        : 'bg-stone-950/90 border-stone-800 text-stone-300 hover:bg-stone-800'
                }`}
                title={
                  isCurrent 
                    ? `Current Active Turn: ${member.name}` 
                    : member.isDone 
                      ? `${member.name} has concluded their turn` 
                      : `Turn order #${index + 1}: ${member.name} (Initiative ${member.initiative})`
                }
              >
                <span className="text-xs">{member.portrait}</span>
                <span className="font-bold font-sans text-xs">
                  {member.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-stone-400">
                  [{member.initiative}]
                </span>

                {isCurrent && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
                {member.isDone && isHero && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Turn Progression Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-pass-turn"
            onClick={onPassTurn}
            disabled={!isHeroTurn || state.isGameOver || state.isVictory}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
              isAllActionsCompleted
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
            }`}
            title="Conclude current hero's turn and pass to next participant in initiative order"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>
              {nextHeroCandidate 
                ? `Pass Turn ➔ ${nextHeroCandidate.name.split(' ')[0]}` 
                : 'Pass Turn ➔ Monster Phase'}
            </span>
          </button>
        </div>
      </div>

      {/* Row 2: 1 Move • 1 Action • 1 Interact Phased Guidance Controller */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-stone-950 p-2 rounded-lg border border-stone-800/80">
        {/* Step 1: Move Action (1 Move limit) */}
        <div className={`flex flex-col justify-between p-2 rounded border transition-all ${
          hasMoved 
            ? 'bg-stone-900/50 border-stone-800/80 opacity-75' 
            : 'bg-stone-900 border-emerald-500/50 shadow-sm shadow-emerald-950/20'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Footprints className={`w-3.5 h-3.5 ${hasMoved ? 'text-stone-500' : 'text-emerald-400'}`} />
              <span className={hasMoved ? 'text-stone-400' : 'text-emerald-300'}>
                1. Move Action
              </span>
            </div>
            {hasMoved ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3" /> Locked
              </span>
            ) : (
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                {activeHero.turnState.moveRemaining} sq available
              </span>
            )}
          </div>

          <div className="text-[11px] text-stone-300 mb-2 leading-tight">
            {activeHero.turnState.statusEffects.length > 0 ? (
              <div className="mb-1 flex flex-wrap gap-1">
                {activeHero.turnState.statusEffects.map(se => (
                  <span 
                    key={se.id}
                    className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-bold text-[9px]"
                    title={se.description}
                  >
                    ⚠️ {se.name}
                  </span>
                ))}
              </div>
            ) : null}
            {hasMoved 
              ? 'Movement completed & locked for this round (1 move limit).' 
              : 'Click any green highlighted tile to navigate.'}
          </div>

          {!hasMoved && isHeroTurn && (
            <button
              id="btn-skip-move"
              onClick={onSkipMove}
              className="mt-auto self-start px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded text-[11px] font-medium transition-all flex items-center gap-1 border border-stone-700"
              title="Decline movement. Locks move action as max moves made and advances to combat/interaction."
            >
              <Lock className="w-3 h-3 text-stone-400" />
              <span>Hold / Lock Move</span>
            </button>
          )}
        </div>

        {/* Step 2: Combat Action (1 Action limit) */}
        <div className={`flex flex-col justify-between p-2 rounded border transition-all ${
          hasActed 
            ? 'bg-stone-900/50 border-stone-800/80 opacity-75' 
            : 'bg-stone-900 border-blue-500/50 shadow-sm shadow-blue-950/20'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Sword className={`w-3.5 h-3.5 ${hasActed ? 'text-stone-500' : 'text-blue-400'}`} />
              <span className={hasActed ? 'text-stone-400' : 'text-blue-300'}>
                2. Combat Action
              </span>
            </div>
            {hasActed ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                <CheckCircle2 className="w-3 h-3" /> Resolved
              </span>
            ) : (
              <span className="text-[10px] font-mono text-blue-300 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/40">
                1 Action
              </span>
            )}
          </div>

          <div className="text-[11px] text-stone-300 mb-2 leading-tight">
            {hasActed ? (
              'Combat action resolved for this turn.'
            ) : prompt?.monstersInRange && prompt.monstersInRange.length > 0 ? (
              <span className="text-amber-300 font-medium">
                🎯 {prompt.monstersInRange[0].name} in reach with {prompt.monstersInRange[0].weaponName} ({prompt.monstersInRange[0].distance} sq away)!
              </span>
            ) : (
              <span className="text-stone-400">
                Out of reach ({activeHero.name} max reach: {Math.max(...activeHero.weapons.map(w => w.range))} sq). Move closer or skip.
              </span>
            )}
          </div>

          {!hasActed && isHeroTurn && (
            <div className="mt-auto flex items-center gap-1.5 flex-wrap">
              {prompt?.monstersInRange && prompt.monstersInRange.length > 0 && (
                <button
                  id="btn-prompt-attack"
                  onClick={() => onExecuteAttack(prompt.monstersInRange[0].id, prompt.monstersInRange[0].weaponIndex)}
                  className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-[11px] font-bold transition-all flex items-center gap-1 shadow"
                  title={`Attack nearest monster (${prompt.monstersInRange[0].name}) with ${prompt.monstersInRange[0].weaponName} (Distance: ${prompt.monstersInRange[0].distance}, Range: ${prompt.monstersInRange[0].weaponRange})`}
                >
                  <Sword className="w-3 h-3" />
                  <span>Strike {prompt.monstersInRange[0].name.split(' ')[0]} ({prompt.monstersInRange[0].weaponName})</span>
                </button>
              )}
              <button
                id="btn-skip-action"
                onClick={onSkipAction}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded text-[11px] font-medium transition-all border border-stone-700"
                title="Pass combat action for this turn."
              >
                <span>Skip Combat</span>
              </button>
            </div>
          )}
        </div>

        {/* Step 3: Item / Interact (1 Interaction limit) */}
        <div className={`flex flex-col justify-between p-2 rounded border transition-all ${
          hasInteracted 
            ? 'bg-stone-900/50 border-stone-800/80 opacity-75' 
            : 'bg-stone-900 border-amber-500/50 shadow-sm shadow-amber-950/20'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Key className={`w-3.5 h-3.5 ${hasInteracted ? 'text-stone-500' : 'text-amber-400'}`} />
              <span className={hasInteracted ? 'text-stone-400' : 'text-amber-300'}>
                3. Item / Interact
              </span>
            </div>
            {hasInteracted ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                <CheckCircle2 className="w-3 h-3" /> Resolved
              </span>
            ) : (
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                1 Interact
              </span>
            )}
          </div>

          <div className="text-[11px] text-stone-300 mb-2 leading-tight">
            {hasInteracted ? (
              'Item or environment interaction resolved.'
            ) : prompt?.nearbyInteractables && prompt.nearbyInteractables.length > 0 ? (
              <span className="text-emerald-300 font-medium">
                ✨ {prompt.nearbyInteractables[0].label}
              </span>
            ) : (
              'No chests, passages, or items adjacent to interact with.'
            )}
          </div>

          {!hasInteracted && isHeroTurn && (
            <div className="mt-auto flex items-center gap-1.5 flex-wrap">
              {prompt?.nearbyInteractables && prompt.nearbyInteractables.length > 0 ? (
                prompt.nearbyInteractables.map((item, idx) => (
                  <button
                    key={`${item.type}-${idx}`}
                    id={`btn-prompt-interact-${item.type}`}
                    onClick={() => onExecuteInteract(item.type, item.id)}
                    className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 text-stone-100 rounded text-[11px] font-bold transition-all flex items-center gap-1 shadow"
                    title={item.label}
                  >
                    {item.type === 'chest' && <Key className="w-3 h-3 text-amber-300" />}
                    {item.type === 'potion' && <FlaskConical className="w-3 h-3 text-emerald-300" />}
                    {item.type === 'door' && <DoorOpen className="w-3 h-3 text-amber-300" />}
                    <span>{item.type === 'chest' ? 'Open Chest' : item.type === 'potion' ? 'Drink Potion' : item.type === 'door' ? 'Enter Passage' : 'Interact'}</span>
                  </button>
                ))
              ) : null}

              <button
                id="btn-skip-interact"
                onClick={onSkipInteract}
                className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded text-[11px] font-medium transition-all border border-stone-700"
                title="Pass interaction action for this turn."
              >
                <span>Skip Interact</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
