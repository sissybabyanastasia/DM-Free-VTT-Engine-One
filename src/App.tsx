/**
 * DM-Free D&D Applet Game Engine
 * Grid-based, turn-based, and cooperative tabletop engine with deterministic monster AI,
 * procedural edge-spawning exploration, hazards, traps, and comprehensive JSON schema.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TabletopGameEngine } from './engine/gameEngine';
import { GameEngineState, GridCoordinate, MonsterInstance, ClassAbility } from './types/schema';
import { distance } from './engine/monsterAI';
import { HeaderBar } from './components/HeaderBar';
import { DungeonGrid } from './components/DungeonGrid';
import { DungeonSidebar } from './components/DungeonSidebar';
import { TacticalSidebar } from './components/TacticalSidebar';
import { CombatLogPanel } from './components/CombatLogPanel';
import { SchemaInspectorModal } from './components/SchemaInspectorModal';
import { CharacterImportModal } from './components/CharacterImportModal';
import { TownShopModal } from './components/TownShopModal';
import { SessionManagerModal } from './components/SessionManagerModal';
import { AuthModal } from './components/AuthModal';
import { MultiplayerBrowser } from './components/MultiplayerBrowser';
import { Trophy, Skull, RotateCcw, ShoppingBag, Coins, FolderArchive, Users, Loader2, WifiOff } from 'lucide-react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { joinLobby, leaveLobby, startMultiplayerGame, subscribeToLobby, syncGameState, Lobby, fetchLobbyState } from './lib/multiplayer';

export default function App() {
  const engineRef = useRef<TabletopGameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new TabletopGameEngine();
  }

  const [engineState, setEngineState] = useState<GameEngineState>(() => engineRef.current!.getState());
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCharacterImportModalOpen, setIsCharacterImportModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Network State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Multiplayer State
  const [isMultiplayerBrowserOpen, setIsMultiplayerBrowserOpen] = useState(false);
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null);
  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const isRemoteUpdateRef = useRef(false);

  // Side drawers & tactical sidebar visibility
  const [isSectorSidebarOpen, setIsSectorSidebarOpen] = useState(false);
  const [isChronicleSidebarOpen, setIsChronicleSidebarOpen] = useState(false);
  const [isTacticalOpen, setIsTacticalOpen] = useState(true);

  // Network offline/online tracking and automatic multiplayer re-sync
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = async () => {
      setIsOffline(false);
      
      // If we are currently in an active multiplayer game, explicitly pull the latest state
      // This guarantees we don't miss any actions taken by other players while we were disconnected.
      if (activeLobbyId) {
        try {
          const latestLobby = await fetchLobbyState(activeLobbyId);
          if (latestLobby && latestLobby.status === 'playing' && latestLobby.gameState) {
            isRemoteUpdateRef.current = true;
            engineRef.current!.loadSavedState(latestLobby.gameState, "Network Re-Sync");
            isRemoteUpdateRef.current = false;
            setActiveLobby(latestLobby);
          }
        } catch (err) {
          console.error("Failed to re-sync lobby state after reconnect:", err);
        }
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [activeLobbyId]);

  // Local engine subscription
  useEffect(() => {
    const unsubscribe = engineRef.current!.subscribe((state) => {
      setEngineState({ ...state });
      
      // Sync to multiplayer lobby if playing and it's our turn/action
      if (activeLobbyId && activeLobby?.status === 'playing' && !isRemoteUpdateRef.current) {
        syncGameState(activeLobbyId, state).catch(err => console.error("Sync failed:", err));
      }
    });
    return unsubscribe;
  }, [activeLobbyId, activeLobby?.status]);

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // Multiplayer Lobby Subscription
  useEffect(() => {
    if (!activeLobbyId) {
      setActiveLobby(null);
      return;
    }
    const unsub = subscribeToLobby(activeLobbyId, (lobby) => {
      setActiveLobby(lobby);
      if (lobby && lobby.status === 'playing' && lobby.gameState) {
        // Prevent infinite loops by flagging remote updates
        isRemoteUpdateRef.current = true;
        engineRef.current!.loadSavedState(lobby.gameState, "Multiplayer Sync");
        isRemoteUpdateRef.current = false;
      }
    });
    return unsub;
  }, [activeLobbyId]);

  const engine = engineRef.current!;
  const activeHero = engineState.heroes[engineState.activeHeroIndex];
  const currentRoom = engineState.activeRooms[engineState.activeRooms.length - 1] || engineState.activeRooms[0];
  const reachableCoords = engine.getReachableCoordinates();

  // Multi-player turn enforcement
  const canAct = () => {
    if (!activeLobby || activeLobby.status !== 'playing') return true; // Local play
    const myPlayer = activeLobby.players.find(p => p.uid === user?.uid);
    if (!myPlayer) return false; // Spectator?
    
    const activeInit = engineState.initiativeList[engineState.currentInitiativeIndex];
    
    // If it's not a hero's turn (e.g. monster phase), only the host can click to dismiss notices/advance
    if (activeInit.type !== 'hero') {
      return activeLobby.hostId === user?.uid;
    }
    
    // Check if the current initiative hero matches this player's assigned heroId
    const currentTurnHeroId = activeInit.id;
    const isMyHeroTurn = currentTurnHeroId === myPlayer.heroId;
    const isUnassignedHero = !activeLobby.players.some(p => p.heroId === currentTurnHeroId);
    
    return isMyHeroTurn || (isUnassignedHero && activeLobby.hostId === user?.uid);
  };

  // Tile Click Handler
  const handleTileClick = (coord: GridCoordinate) => {
    if (!canAct()) return;
    engine.moveActiveHero(coord);
  };

  // Monster Click Handler (Checks range with equipped weapons)
  const handleMonsterClick = (monster: MonsterInstance) => {
    if (!canAct()) return;
    if (!activeHero) return;
    const dist = distance(activeHero.position, monster.position);
    const validWeaponIdx = activeHero.weapons.findIndex(w => dist <= w.range);
    engine.executeHeroAttack(monster.id, validWeaponIdx !== -1 ? validWeaponIdx : 0);
  };

  // Interact Handler
  const handleInteractTarget = (type: 'chest' | 'trap' | 'pillar' | 'potion' | 'door' | 'cell' | 'treasure_hoard', id?: string) => {
    if (!canAct()) return;
    engine.executeInteract(type as any, id);
  };

  const handleStartLobby = async () => {
    if (!activeLobbyId) return;
    // Before starting, reload the selected module to get fresh state (including prefabs)
    engine.startNewCampaign(activeLobby!.moduleId);
    await startMultiplayerGame(activeLobbyId, engine.getState());
  };

  const handleLeaveLobby = async () => {
    if (activeLobbyId) await leaveLobby(activeLobbyId);
    setActiveLobbyId(null);
  };

  if (isMultiplayerBrowserOpen) {
    return (
      <MultiplayerBrowser 
        onJoin={(lobbyId) => {
          setActiveLobbyId(lobbyId);
          setIsMultiplayerBrowserOpen(false);
        }}
        onBack={() => setIsMultiplayerBrowserOpen(false)}
      />
    );
  }

  if (activeLobby && activeLobby.status === 'waiting') {
    return (
      <div className="flex flex-col h-screen w-screen bg-stone-950 text-stone-100 items-center justify-center p-6">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-8 text-center shadow-2xl">
          <h1 className="text-3xl font-black text-amber-500 font-serif mb-2">{activeLobby.name}</h1>
          <p className="text-stone-400 mb-6">Waiting for players...</p>
          
          <div className="space-y-3 mb-8 text-left">
            {activeLobby.players.map((p, idx) => (
              <div key={p.uid} className="bg-stone-950 border border-stone-800 p-3 rounded-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 font-bold">
                  {idx + 1}
                </div>
                <span className="font-semibold text-stone-200">
                  {p.uid === user?.uid ? 'You (' + p.email + ')' : p.email}
                  {p.uid === activeLobby.hostId && <span className="ml-2 text-xs text-amber-500 font-mono">[Host]</span>}
                </span>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: 4 - activeLobby.players.length }).map((_, i) => (
              <div key={'empty-' + i} className="bg-stone-950/50 border border-stone-800 border-dashed p-3 rounded-lg flex items-center gap-3 opacity-50">
                <div className="w-8 h-8 rounded-full border border-stone-700 border-dashed flex items-center justify-center text-stone-600">
                  {activeLobby.players.length + i + 1}
                </div>
                <span className="text-stone-500 italic">Empty Slot (Will use Prefab)</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleLeaveLobby}
              className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl transition-colors"
            >
              Leave Lobby
            </button>
            {activeLobby.hostId === user?.uid && (
              <button
                onClick={handleStartLobby}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-xl transition-colors"
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-stone-950 text-stone-100 font-sans select-none overflow-hidden">
      {/* Top Menu Bar: Title, Module Selector, Active Sector, Chronicle, Tactical Controls, Schema */}
      <HeaderBar
        state={engineState}
        user={user}
        onSelectModule={(modId) => {
          if (activeLobby && activeLobby.hostId !== user?.uid) return;
          engine.loadModule(modId);
        }}
        onRestart={() => {
          if (activeLobby && activeLobby.hostId !== user?.uid) return;
          engine.restartCurrentModule();
        }}
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
        onOpenShop={() => setIsShopOpen(true)}
        onOpenSessions={() => setIsSessionsModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenCharacterImport={() => setIsCharacterImportModalOpen(true)}
        isSectorOpen={isSectorSidebarOpen}
        onToggleSector={() => setIsSectorSidebarOpen(!isSectorSidebarOpen)}
        isChronicleOpen={isChronicleSidebarOpen}
        onToggleChronicle={() => setIsChronicleSidebarOpen(!isChronicleSidebarOpen)}
        isTacticalOpen={isTacticalOpen}
        onToggleTactical={() => setIsTacticalOpen(!isTacticalOpen)}
      />

      {/* Multiplayer Overlay Button */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
        {isOffline && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-red-950 border border-red-500/50 rounded-full shadow-lg text-xs font-bold text-red-300 animate-pulse">
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
            Connection Lost - Waiting to Reconnect...
          </div>
        )}
        
        {activeLobbyId ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950 border border-indigo-500/50 rounded-full shadow-lg text-xs font-bold text-indigo-300">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Playing Online
            <button onClick={handleLeaveLobby} className="ml-2 px-2 py-0.5 bg-stone-900 rounded hover:bg-stone-800 text-stone-400 transition-colors">Leave</button>
          </div>
        ) : (
          <button
            onClick={() => setIsMultiplayerBrowserOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-stone-900 border border-stone-800 hover:border-amber-500/50 rounded-full shadow-lg text-xs font-bold text-stone-300 hover:text-amber-400 transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            Multiplayer
          </button>
        )}
      </div>

      {/* Main Workspace: Central Dungeon Map with Side Tactical Command Panel */}
      <div className="flex-1 relative overflow-hidden flex flex-row">
        {/* Full View Tabletop Tactical Grid Canvas (The center of attention) */}
        <main className="flex-1 flex flex-col h-full w-full relative overflow-hidden bg-stone-950">
          <DungeonGrid
            state={engineState}
            reachableCoords={reachableCoords}
            onSelectHero={(heroId) => engine.selectHero(heroId)}
            onTileClick={handleTileClick}
            onMonsterClick={handleMonsterClick}
            onInteractTarget={handleInteractTarget}
          />

          {/* Victory Overlay Modal */}
          {engineState.isVictory && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-md text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center text-amber-400 mb-4 animate-bounce">
                <Trophy className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-amber-300 font-serif tracking-wide mb-2">
                Module Boss Vanquished!
              </h2>
              <p className="text-stone-300 text-sm max-w-md mb-6 leading-relaxed">
                The party has defeated the Module Boss, conquered all module parameters, and claimed +350 GP in guild bounties! Town merchants are now open for business.
              </p>
              <div className="flex items-center gap-4 bg-stone-900 border border-stone-800 px-6 py-3 rounded-xl font-mono text-xs text-stone-300 mb-6">
                <span>Rooms: {engineState.gameStats.roomsExplored}</span>
                <span>•</span>
                <span>Foes Slain: {engineState.gameStats.monstersSlain}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  Gold: {engineState.partyGold} GP
                </span>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsShopOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-xl shadow-amber-950/40 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Visit Town Shop ({engineState.partyGold} GP)</span>
                </button>
                <button
                  onClick={() => setIsSessionsModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-sm border border-amber-500/40 transition-all cursor-pointer"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Save / Manage Sessions</span>
                </button>
                <button
                  onClick={() => engine.restartCurrentModule()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-sm border border-stone-800 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Replay Module</span>
                </button>
              </div>
            </div>
          )}

          {/* Defeat Overlay Modal */}
          {engineState.isGameOver && !engineState.isVictory && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-md text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-950 border-2 border-red-600 flex items-center justify-center text-red-500 mb-4">
                <Skull className="w-10 h-10 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black text-red-400 font-serif tracking-wide mb-2">
                Party Slain
              </h2>
              <p className="text-stone-400 text-sm max-w-md mb-6 leading-relaxed">
                All heroes have fallen before the deterministic algorithmic threats. The dungeon claims another band of adventurers.
              </p>
              <button
                onClick={() => engine.restartCurrentModule()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-sm shadow-xl transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Dungeon Crawl</span>
              </button>
            </div>
          )}
        </main>

        {/* Tactical Command Sidebar (Initiative Order, Party Roster & Cooperative Action Phase) */}
        <TacticalSidebar
          state={engineState}
          onSelectHero={(heroId) => { if (canAct()) engine.selectHero(heroId) }}
          onSelectAction={(action, abilityId) => { if (canAct()) engine.selectAction(action, abilityId) }}
          onExecuteAttack={(monsterId, weaponIdx) => { if (canAct()) engine.executeHeroAttack(monsterId, weaponIdx) }}
          onExecuteAbility={(ability: ClassAbility) => { if (canAct()) engine.executeHeroAbility(ability) }}
          onExecuteInteract={(type, id) => { if (canAct()) engine.executeInteract(type, id) }}
          onSkipMove={() => { if (canAct()) engine.skipMove() }}
          onPassTurn={() => { if (canAct()) engine.passTurnToNextHero() }}
          onEndPartyTurn={() => { if (canAct()) engine.endPartyTurn() }}
          onDismissNotice={() => { if (canAct()) engine.dismissNotice() }}
          isOpen={isTacticalOpen}
          onToggle={() => setIsTacticalOpen(!isTacticalOpen)}
        />

        {/* Active Sector Drawer Modal (Opened from Menu Bar with Option to Close) */}
        <AnimatePresence>
          {isSectorSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSectorSidebarOpen(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-30 cursor-pointer"
              />
              <motion.aside
                initial={{ x: -380, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -380, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute left-0 top-0 bottom-0 w-84 sm:w-96 bg-stone-950/98 border-r border-stone-800 p-3 shadow-2xl z-40 flex flex-col"
              >
                <DungeonSidebar
                  state={engineState}
                  activeHero={activeHero}
                  activeRoom={currentRoom}
                  onClose={() => setIsSectorSidebarOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Tabletop Chronicle Drawer Modal (Opened from Menu Bar with Option to Close) */}
        <AnimatePresence>
          {isChronicleSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsChronicleSidebarOpen(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-30 cursor-pointer"
              />
              <motion.aside
                initial={{ x: 440, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 440, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute right-0 top-0 bottom-0 w-84 sm:w-96 md:w-[440px] bg-stone-950/98 border-l border-stone-800 p-3 shadow-2xl z-40 flex flex-col"
              >
                <CombatLogPanel
                  logs={engineState.combatLog}
                  onClose={() => setIsChronicleSidebarOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Formal JSON Schema & Data Inspector Modal */}
      <SchemaInspectorModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />

      {/* Campaign Out-of-Session Town Shop Modal */}
      <TownShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        state={engineState}
        onBuyItem={(itemId, heroId) => engine.buyShopItem(itemId, heroId)}
      />

      {/* Session Saver & Campaign Manager Modal */}
      <SessionManagerModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        currentState={engineState}
        onRestoreSession={(loadedState, sessionName) => {
          engine.loadSavedState(loadedState, sessionName);
        }}
        onStartNewCampaign={(moduleId) => {
          engine.startNewCampaign(moduleId);
        }}
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        user={user} 
      />

      <CharacterImportModal
        isOpen={isCharacterImportModalOpen}
        onClose={() => setIsCharacterImportModalOpen(false)}
        user={user}
        onCharacterImported={(data) => {
          engine.addImportedHero(data);
        }}
      />
    </div>
  );
}
