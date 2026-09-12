import React from 'react';
import { GameEngineState, RoomDataBlock, HeroCharacter } from '../types/schema';
import { Compass, ShieldAlert, Sparkles, Footprints, AlertTriangle, Key, Flame, Heart, ChevronLeft } from 'lucide-react';

interface DungeonSidebarProps {
  state: GameEngineState;
  activeHero: HeroCharacter;
  activeRoom: RoomDataBlock;
  onClose?: () => void;
}

export const DungeonSidebar: React.FC<DungeonSidebarProps> = ({
  state,
  activeHero,
  activeRoom,
  onClose
}) => {
  // Traps and uncollapsed hazards are secrets of the dungeon - only show once sprung or collapsed
  const activeHazards = state.activeRooms.flatMap(r => r.hazards).filter(h => h.state === 'collapsed');
  const activeTraps = state.activeRooms.flatMap(r => r.traps).filter(t => t.isTriggered || t.isDisarmed);
  const activeBossEncounter = state.activeRooms.find(r => r.bossEncounter)?.bossEncounter;

  return (
    <div className="w-full h-full flex flex-col gap-3 overflow-y-auto pr-1 text-xs">
      {/* Top Sidebar Header with Close Button */}
      {onClose && (
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-900 rounded-xl border border-stone-800 shadow-md">
          <div className="flex items-center gap-2 font-bold text-stone-100 text-sm">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Active Sector Intel</span>
          </div>
          <button
            id="btn-close-sector"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all border border-stone-700 cursor-pointer"
            title="Close Active Sector panel"
          >
            <span>Close</span>
            <span className="font-bold">✕</span>
          </button>
        </div>
      )}

      {/* Current Room Overview Card */}
      <div className="p-3.5 bg-stone-900/90 rounded-xl border border-stone-800 shadow-lg flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            Active Dungeon Sector
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono">
            Room {activeRoom.roomIndex} of {state.currentModule.rooms.length}
          </span>
        </div>

        <h3 className="text-sm font-bold text-stone-100 font-serif">
          {activeRoom.title}
        </h3>

        <p className="text-stone-400 italic text-[11px] leading-relaxed">
          "{activeRoom.flavorText}"
        </p>

        {/* Spawning Map Rule Guide */}
        <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-600/40 text-[11px] text-amber-200/90">
          <strong className="text-amber-300 font-mono block mb-0.5">Spawning Map Rule:</strong>
          Step onto any glowing <span className="font-bold text-amber-400">DOOR</span> tile to reveal the next room!
        </div>

        {/* Boss Encounter Banner if active */}
        {activeBossEncounter && (
          <div className="p-2.5 rounded-lg bg-purple-950/50 border border-purple-600/60 flex flex-col gap-1">
            <div className="flex items-center justify-between text-purple-300 font-bold">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                {activeBossEncounter.bossName}
              </span>
              <span className="text-[10px] font-mono">Phase {activeBossEncounter.currentPhase}/{activeBossEncounter.totalPhases}</span>
            </div>
            <p className="text-[10px] text-purple-200/80 font-sans">
              {activeBossEncounter.phaseMechanics[activeBossEncounter.currentPhase - 1]?.description}
            </p>
            {activeBossEncounter.pillarsToDeactivate && (
              <div className="text-[10px] font-mono text-purple-300">
                Pillars active: {activeBossEncounter.pillarsToDeactivate.filter(p => !p.isDeactivated).length} / {activeBossEncounter.pillarsToDeactivate.length}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Environmental Hazards & Traps Status (Only revealed after trigger/collapse) */}
      {(activeHazards.length > 0 || activeTraps.length > 0) && (
        <div className="p-3 bg-stone-900/90 rounded-xl border border-stone-800 shadow-md flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Sprung Hazards & Traps
          </span>

          {activeHazards.map(hazard => (
            <div key={hazard.id} className="p-2 bg-stone-950/80 rounded border border-red-950/70 text-[11px]">
              <div className="flex items-center justify-between text-red-400 font-semibold">
                <span>{hazard.name}</span>
                <span className="font-mono text-[10px]">COLLAPSED PIT</span>
              </div>
              <div className="text-stone-400 text-[10px] mt-0.5">
                The stone floor has given way, plunging into a dangerous spike pit cavity.
              </div>
            </div>
          ))}

          {activeTraps.map(trap => (
            <div key={trap.id} className="p-2 bg-stone-950/80 rounded border border-red-950 text-[11px]">
              <div className="flex items-center justify-between text-red-300 font-semibold">
                <span>{trap.name}</span>
                <span className="font-mono text-[10px]">{trap.isDisarmed ? 'DISARMED' : 'SPRUNG'}</span>
              </div>
              <div className="text-stone-400 text-[10px] mt-0.5">
                {trap.description}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Hero Inventory & Artifacts */}
      <div className="p-3.5 bg-stone-900/90 rounded-xl border border-stone-800 shadow-md flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold flex items-center gap-1">
          <Key className="w-3.5 h-3.5 text-amber-400" />
          {activeHero.name}'s Bag & Artifacts
        </span>

        {activeHero.inventory.length === 0 ? (
          <div className="text-stone-500 italic text-[11px] py-1">No items in bag. Open chests to discover loot!</div>
        ) : (
          <div className="space-y-1.5">
            {activeHero.inventory.map((item, idx) => (
              <div 
                key={`${item.id}-${idx}`}
                className={`p-2 rounded bg-stone-950/80 border text-[11px] flex flex-col gap-0.5 ${
                  item.rarity === 'legendary' 
                    ? 'border-amber-500/60 bg-amber-950/20 text-amber-200' 
                    : item.rarity === 'epic'
                      ? 'border-purple-500/50 text-purple-200'
                      : 'border-stone-800 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{item.name}</span>
                  <span className="text-[9px] font-mono uppercase px-1 rounded bg-stone-900 text-stone-400">
                    {item.rarity}
                  </span>
                </div>
                <div className="text-[10px] text-stone-400">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
