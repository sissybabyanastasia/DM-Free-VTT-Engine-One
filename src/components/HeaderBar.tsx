import React from 'react';
import { GameEngineState } from '../types/schema';
import { ALL_MODULES } from '../data/modulesData';
import { 
  Shield, 
  RotateCcw, 
  Code, 
  Compass, 
  Terminal, 
  Swords, 
  ShoppingBag,
  Coins,
  Lock,
  Flame,
  KeyRound,
  FolderArchive,
  Trophy,
  Skull,
  User
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderBarProps {
  state: GameEngineState;
  user: FirebaseUser | null;
  onSelectModule: (moduleId: string) => void;
  onRestart: () => void;
  onOpenSchemaModal: () => void;
  onOpenShop: () => void;
  onOpenSessions: () => void;
  onOpenAuth: () => void;
  isSectorOpen: boolean;
  onToggleSector: () => void;
  isChronicleOpen: boolean;
  onToggleChronicle: () => void;
  isTacticalOpen: boolean;
  onToggleTactical: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  state,
  user,
  onSelectModule,
  onRestart,
  onOpenSchemaModal,
  onOpenShop,
  onOpenSessions,
  onOpenAuth,
  isSectorOpen,
  onToggleSector,
  isChronicleOpen,
  onToggleChronicle,
  isTacticalOpen,
  onToggleTactical
}) => {
  const currentRoom = state.activeRooms[state.activeRooms.length - 1] || state.activeRooms[0];
  const houndEvent = state.houndEventState;
  const vaultScenario = state.treasureChamberScenario;

  return (
    <header className="w-full bg-stone-950 border-b border-stone-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg z-30 shrink-0">
      {/* Left: Brand, Module Dropdown, Round & Active Scenarios */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-red-800 border border-amber-500/50 text-stone-100 shadow-md">
            <Shield className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-black text-stone-100 font-serif tracking-wide block leading-none">
              DM-Free Tabletop
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              VTT Engine
            </span>
          </div>
        </div>

        {/* Module Selector */}
        <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700/80 rounded-lg px-2 py-1">
          <label className="text-[11px] font-mono text-stone-400 hidden md:inline">Module:</label>
          <select
            id="select-module"
            value={state.currentModuleId}
            onChange={(e) => onSelectModule(e.target.value)}
            className="bg-transparent text-stone-200 text-xs font-sans outline-none cursor-pointer max-w-[140px] sm:max-w-none truncate"
          >
            {ALL_MODULES.map((m) => (
              <option key={m.id} value={m.id} className="bg-stone-900 text-stone-200">
                {m.title}
              </option>
            ))}
          </select>
        </div>

        {/* Round Badge */}
        <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-900 border border-stone-800 text-[11px] font-mono text-amber-300">
          <span className="text-stone-400">Round</span>
          <span className="font-bold">{state.currentRound}</span>
        </div>

        {/* Scenario Badge: Prison Cells Rescue Count */}
        {houndEvent && houndEvent.rescuedPrisoners > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.8 rounded-md bg-stone-900 border border-amber-700/50 text-[11px] font-mono text-amber-300 animate-pulse">
            <KeyRound className="w-3 h-3 text-amber-400" />
            <span>Captives: {houndEvent.rescuedPrisoners}/10</span>
          </div>
        )}

        {/* Scenario Badge: Vault Countdown */}
        {vaultScenario && !vaultScenario.isSealed && (
          <div className="flex items-center gap-1.5 px-2 py-0.8 rounded-md bg-red-950/80 border border-red-500/70 text-[11px] font-mono text-red-300 animate-bounce">
            <Flame className="w-3 h-3 text-red-400" />
            <span>Vault Seal: {vaultScenario.roundsUntilSeal} Rds</span>
          </div>
        )}

        {/* Boss Mandate Status Badge */}
        {state.isVictory ? (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-[11px] font-mono text-emerald-300">
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Boss Slain • Shop Open</span>
          </div>
        ) : (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-[11px] font-mono text-amber-300/80" title="Mandate: Slay the Module Boss to conquer the module, claim completion spoils, and unlock the Town Shop!">
            <Skull className="w-3.5 h-3.5 text-amber-500/70" />
            <span>Mandate: Slay Boss</span>
          </div>
        )}
      </div>

      {/* Right: Gold Counter, Town Shop Button, Drawer Menus & Tools */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Auth Button */}
        <button
          onClick={onOpenAuth}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
            user
              ? 'bg-emerald-950 text-emerald-200 border-emerald-500/40 shadow-sm'
              : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-700/80'
          }`}
          title={user ? `Logged in as ${user.email}` : "Log In / Register"}
        >
          <User className={`w-3.5 h-3.5 ${user ? 'text-emerald-400' : 'text-stone-400'}`} />
          <span className="hidden lg:inline">{user ? 'Account' : 'Sign In'}</span>
        </button>

        {/* Sessions Manager Button */}
        <button
          id="menu-btn-sessions"
          onClick={onOpenSessions}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-all shadow-sm"
          title="Session Saver & Campaign Manager (Store, restore, import/export JSON sessions, or start new modules)"
        >
          <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Sessions</span>
        </button>

        {/* Party Gold Display */}
        <div 
          id="badge-party-gold"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold shadow-inner"
          title="Party Gold Coins - Retained across modules for Town Shop gear"
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>{state.partyGold} GP</span>
        </div>

        {/* Town Shop Menu Button */}
        <button
          id="menu-btn-shop"
          onClick={onOpenShop}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
            state.canAccessShop
              ? 'bg-amber-950/90 text-amber-200 border-amber-500/90 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/50 hover:bg-amber-900/90'
              : 'bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-300 border-stone-800'
          }`}
          title={
            state.canAccessShop
              ? "Open Town Shop (Equip weapons, armor, & potions with gold)"
              : "Town Shop (Locked: Slay the Module Boss to unlock shop & rewards)"
          }
        >
          <ShoppingBag className={`w-3.5 h-3.5 ${state.canAccessShop ? 'text-amber-400 animate-bounce' : 'text-stone-500'}`} />
          <span className="font-semibold">Shop</span>
          {state.canAccessShop ? (
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-mono text-[9px] font-bold uppercase tracking-wider">
              Open
            </span>
          ) : (
            <Lock className="w-3 h-3 text-stone-500" />
          )}
        </button>

        {/* Active Sector Menu Button */}
        <button
          id="menu-btn-sector"
          onClick={onToggleSector}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
            isSectorOpen
              ? 'bg-amber-950/80 text-amber-200 border-amber-500 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/40'
              : 'bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border-stone-700/80'
          }`}
          title={isSectorOpen ? "Close Active Sector Drawer" : "Open Active Sector Drawer"}
        >
          <Compass className={`w-3.5 h-3.5 ${isSectorOpen ? 'text-amber-400' : 'text-stone-400'}`} />
          <span className="hidden sm:inline font-semibold">Active Sector</span>
          <span className="px-1.5 py-0.2 rounded bg-stone-950 border border-stone-800 text-amber-400 font-mono text-[10px] font-bold">
            R{currentRoom.roomIndex}
          </span>
        </button>

        {/* Chronicle Menu Button */}
        <button
          id="menu-btn-chronicle"
          onClick={onToggleChronicle}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
            isChronicleOpen
              ? 'bg-amber-950/80 text-amber-200 border-amber-500 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/40'
              : 'bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border-stone-700/80'
          }`}
          title={isChronicleOpen ? "Close Chronicle Drawer" : "Open Chronicle (Combat Log) Drawer"}
        >
          <Terminal className={`w-3.5 h-3.5 ${isChronicleOpen ? 'text-amber-400' : 'text-stone-400'}`} />
          <span className="hidden sm:inline font-semibold">Chronicle</span>
          <span className="px-1.5 py-0.2 rounded bg-stone-950 border border-stone-800 text-amber-400 font-mono text-[10px] font-bold">
            {state.combatLog.length}
          </span>
        </button>

        {/* Tactical Command Sidebar Toggle Button */}
        <button
          id="menu-btn-tactical"
          onClick={onToggleTactical}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
            isTacticalOpen
              ? 'bg-amber-950/80 text-amber-200 border-amber-500 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/40'
              : 'bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border-stone-700/80'
          }`}
          title={isTacticalOpen ? "Hide Tactical Sidebar" : "Show Tactical Sidebar (Party & Initiative)"}
        >
          <Swords className={`w-3.5 h-3.5 ${isTacticalOpen ? 'text-amber-400' : 'text-stone-400'}`} />
          <span className="hidden md:inline font-semibold">Tactical Sidebar</span>
        </button>

        {/* JSON Schema Button */}
        <button
          id="btn-open-schema-modal"
          onClick={onOpenSchemaModal}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/80 text-xs font-mono transition-all cursor-pointer"
          title="Inspect & Export formal JSON Schema"
        >
          <Code className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Schema</span>
        </button>

        {/* Restart Button */}
        <button
          id="btn-restart-encounter"
          onClick={onRestart}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/80 text-xs font-sans transition-all cursor-pointer"
          title="Reset current dungeon layout"
        >
          <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
          <span className="hidden lg:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
