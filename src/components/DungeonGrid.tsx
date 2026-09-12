import React, { useState, useEffect, useRef } from 'react';
import { 
  GameEngineState, 
  GridCoordinate, 
  HeroCharacter, 
  MonsterInstance,
  HazardInstance,
  TrapInstance,
  ChestInstance,
  PrisonCellInstance,
  TreasureHoardInstance,
  GridTile
} from '../types/schema';
import { distance } from '../engine/monsterAI';
import { 
  Shield, 
  Skull, 
  Sparkles, 
  AlertTriangle, 
  Key, 
  Footprints, 
  Flame, 
  Eye, 
  Lock, 
  Check, 
  KeyRound, 
  Coins,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Move,
  RotateCcw
} from 'lucide-react';

interface DungeonGridProps {
  state: GameEngineState;
  reachableCoords: Set<string>;
  onSelectHero: (heroId: string) => void;
  onTileClick: (coord: GridCoordinate) => void;
  onMonsterClick: (monster: MonsterInstance) => void;
  onInteractTarget: (type: 'chest' | 'trap' | 'pillar' | 'cell' | 'treasure_hoard', id?: string) => void;
}

export const DungeonGrid: React.FC<DungeonGridProps> = ({
  state,
  reachableCoords,
  onSelectHero,
  onTileClick,
  onMonsterClick,
  onInteractTarget
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeHero = state.heroes[state.activeHeroIndex];

  // Camera Zoom Level: 0.5 (Eagle-eye / Pan Out) to 1.3 (Close inspection)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Mouse Drag-to-Pan state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const dragDistance = useRef(0);

  // Dynamic calculation of grid bounding box of all revealed tiles AND all living heroes
  let minX = 0, maxX = 6, minY = 0, maxY = 6;
  state.allTiles.forEach(tile => {
    if (tile.isRevealed) {
      minX = Math.min(minX, tile.x);
      maxX = Math.max(maxX, tile.x);
      minY = Math.min(minY, tile.y);
      maxY = Math.max(maxY, tile.y);
    }
  });

  // Guarantee all heroes are always inside the visible grid boundaries
  state.heroes.forEach(h => {
    if (h.hp > 0) {
      minX = Math.min(minX, h.position.x);
      maxX = Math.max(maxX, h.position.x);
      minY = Math.min(minY, h.position.y);
      maxY = Math.max(maxY, h.position.y);
    }
  });

  // Generous 2-tile border buffer for smooth viewing
  const gridMinX = Math.max(0, minX - 2);
  const gridMaxX = maxX + 2;
  const gridMinY = Math.max(0, minY - 2);
  const gridMaxY = maxY + 2;
  const totalCols = gridMaxX - gridMinX + 1;
  const totalRows = gridMaxY - gridMinY + 1;

  // Direct fast lookups computed on each render for real-time reactivity
  const heroesByCoord = new Map<string, HeroCharacter>();
  state.heroes.forEach(h => {
    if (h.hp > 0) heroesByCoord.set(`${h.position.x},${h.position.y}`, h);
  });

  const monstersByCoord = new Map<string, MonsterInstance>();
  state.activeRooms.flatMap(r => r.monsters).forEach(m => {
    if (m.isAlive) monstersByCoord.set(`${m.position.x},${m.position.y}`, m);
  });

  const hazardsByCoord = new Map<string, HazardInstance>();
  state.activeRooms.flatMap(r => r.hazards).forEach(h => {
    hazardsByCoord.set(`${h.coordinate.x},${h.coordinate.y}`, h);
  });

  const trapsByCoord = new Map<string, TrapInstance>();
  state.activeRooms.flatMap(r => r.traps).forEach(t => {
    trapsByCoord.set(`${t.coordinate.x},${t.coordinate.y}`, t);
  });

  const chestsByCoord = new Map<string, ChestInstance>();
  state.activeRooms.flatMap(r => r.chests).forEach(c => {
    chestsByCoord.set(`${c.coordinate.x},${c.coordinate.y}`, c);
  });

  const cellsByCoord = new Map<string, PrisonCellInstance>();
  state.activeRooms.flatMap(r => r.prisonCells || []).forEach(cell => {
    cellsByCoord.set(`${cell.coordinate.x},${cell.coordinate.y}`, cell);
  });

  const hoardsByCoord = new Map<string, TreasureHoardInstance>();
  state.activeRooms.forEach(r => {
    if (r.treasureHoard) {
      hoardsByCoord.set(`${r.treasureHoard.coordinate.x},${r.treasureHoard.coordinate.y}`, r.treasureHoard);
    }
  });

  const pillarsByCoord = new Map<string, { isDeactivated: boolean }>();
  state.activeRooms.forEach(r => {
    r.bossEncounter?.pillarsToDeactivate?.forEach(p => {
      pillarsByCoord.set(`${p.coordinate.x},${p.coordinate.y}`, p);
    });
  });

  // Center on coordinate with smooth scrolling
  const centerOnCoordinate = (coord: GridCoordinate, smooth: boolean = true) => {
    const tileId = `tile-${coord.x}-${coord.y}`;
    const el = document.getElementById(tileId);
    if (el && viewportRef.current) {
      el.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto', 
        block: 'center', 
        inline: 'center' 
      });
    }
  };

  // AUTO-ADJUST CAMERA: Whenever the active hero changes or their position updates,
  // automatically center the viewer on that hero's coordinates!
  useEffect(() => {
    if (activeHero) {
      const timer = setTimeout(() => {
        centerOnCoordinate(activeHero.position, true);
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [activeHero?.id, activeHero?.position.x, activeHero?.position.y, state.activeHeroIndex]);

  // Fit Entire Map / Pan Out
  const handleFitMap = () => {
    if (!viewportRef.current) return;
    const vpWidth = viewportRef.current.clientWidth - 80;
    const vpHeight = viewportRef.current.clientHeight - 120;
    const requiredWidth = totalCols * 56;
    const requiredHeight = totalRows * 56;
    const scaleX = vpWidth / requiredWidth;
    const scaleY = vpHeight / requiredHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.0);
    const clampedScale = Math.max(0.45, Math.min(1.0, Math.round(fitScale * 100) / 100));
    setZoomLevel(clampedScale);
    setTimeout(() => {
      if (activeHero) {
        centerOnCoordinate(activeHero.position, true);
      }
    }, 60);
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!viewportRef.current) return;
    isDragging.current = true;
    dragDistance.current = 0;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !viewportRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragDistance.current += Math.abs(dx) + Math.abs(dy);
    viewportRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
    viewportRef.current.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Tile dimensions scaled with zoomLevel
  const tileSize = Math.round(56 * zoomLevel);
  const tokenSize = zoomLevel < 0.7 ? 'w-7 h-7 text-xs' : zoomLevel < 0.9 ? 'w-9 h-9 text-sm' : 'w-10 h-10 text-base';

  // Generate grid rows
  const gridRows: { x: number; y: number }[][] = [];
  for (let y = gridMinY; y <= gridMaxY; y++) {
    const row: { x: number; y: number }[] = [];
    for (let x = gridMinX; x <= gridMaxX; x++) {
      row.push({ x, y });
    }
    gridRows.push(row);
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-stone-950 overflow-hidden select-none">
      {/* FLOATING TOP HUD: Quick Hero Jumper & Tactical Camera Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: Zoom & Pan Controls Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-stone-900/90 backdrop-blur-md rounded-xl border border-stone-800 shadow-xl pointer-events-auto">
          <button
            id="btn-zoom-out"
            onClick={() => setZoomLevel(prev => Math.max(0.5, Math.round((prev - 0.15) * 100) / 100))}
            className="flex items-center justify-center p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-all cursor-pointer"
            title="Pan Out / Zoom Out (Show More Map)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="font-mono text-[11px] font-bold text-amber-300 px-1.5 min-w-11 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            id="btn-zoom-in"
            onClick={() => setZoomLevel(prev => Math.min(1.3, Math.round((prev + 0.15) * 100) / 100))}
            className="flex items-center justify-center p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-all cursor-pointer"
            title="Zoom In (Closer Inspection)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-stone-700 mx-0.5" />

          <button
            id="btn-fit-map"
            onClick={handleFitMap}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-stone-300 hover:text-amber-300 hover:bg-stone-800 transition-all cursor-pointer"
            title="Pan Out to Show Entire Explored Dungeon"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit Map</span>
          </button>

          <button
            id="btn-reset-zoom"
            onClick={() => {
              setZoomLevel(1.0);
              if (activeHero) centerOnCoordinate(activeHero.position, true);
            }}
            className="flex items-center justify-center p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-all cursor-pointer"
            title="Reset Zoom to 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Hero Quick-Jump Strip */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-900/90 backdrop-blur-md rounded-xl border border-stone-800 shadow-xl pointer-events-auto overflow-x-auto max-w-full">
          {state.heroes.map((hero, idx) => {
            const isActive = hero.id === activeHero?.id;
            const isAlive = hero.hp > 0;

            return (
              <button
                key={hero.id}
                id={`hero-jump-chip-${hero.id}`}
                onClick={() => {
                  onSelectHero(hero.id);
                  centerOnCoordinate(hero.position, true);
                }}
                disabled={!isAlive}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/40 shadow-lg scale-105'
                    : isAlive
                      ? 'bg-stone-950/70 border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white'
                      : 'bg-stone-950/40 border-stone-900 text-stone-600 line-through cursor-not-allowed'
                }`}
                title={`Click to focus camera and select ${hero.name} at (${hero.position.x}, ${hero.position.y})`}
              >
                <span className="text-sm leading-none">{hero.portrait}</span>
                <span className="font-semibold">{hero.name.split(' ')[0]}</span>
                <span className="text-[10px] text-stone-400 font-mono">({hero.position.x},{hero.position.y})</span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Quick Center on Active Player Button */}
        {activeHero && (
          <div className="flex items-center pointer-events-auto">
            <button
              id="btn-focus-active-hero"
              onClick={() => centerOnCoordinate(activeHero.position, true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:scale-105 cursor-pointer font-sans"
              title={`Center viewer directly on ${activeHero.name}'s piece at (${activeHero.position.x}, ${activeHero.position.y})`}
            >
              <Crosshair className="w-4 h-4 animate-spin-slow" />
              <span>Center on {activeHero.name.split(' ')[0]} ({activeHero.position.x}, {activeHero.position.y})</span>
            </button>
          </div>
        )}
      </div>

      {/* SCROLLABLE / DRAGGABLE TABLETOP MAP CONTAINER */}
      <div 
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full overflow-auto bg-stone-950 p-16 sm:p-24 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* Tabletop Grid Board */}
        <div 
          className="inline-block relative p-3 sm:p-4 bg-stone-900/95 rounded-2xl border-2 border-stone-800/90 shadow-[0_0_60px_rgba(0,0,0,0.9),inset_0_0_40px_rgba(0,0,0,0.8)] m-auto transition-all"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${totalCols}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${totalRows}, ${tileSize}px)`,
            gap: zoomLevel < 0.7 ? '2px' : '3px'
          }}
        >
          {gridRows.flatMap(row => row.map(cell => {
            const key = `${cell.x},${cell.y}`;
            const tile = state.allTiles.get(key);
            const hero = heroesByCoord.get(key);
            const monster = monstersByCoord.get(key);
            const hazard = hazardsByCoord.get(key);
            const trap = trapsByCoord.get(key);
            const chest = chestsByCoord.get(key);
            const cellObj = cellsByCoord.get(key);
            const hoardObj = hoardsByCoord.get(key);
            const pillar = pillarsByCoord.get(key);

            const isRevealed = tile?.isRevealed ?? false;
            const isEdge = tile?.kind === 'edge';
            const isWall = tile?.kind === 'wall';
            const isGilded = tile?.kind === 'gilded_floor' || !!hoardObj;
            const isCellTile = tile?.kind === 'cell' || !!cellObj;
            const isWalkable = tile?.walkable ?? false;
            const isMoveTarget = reachableCoords.has(key);
            const isHeroSelected = hero && hero.id === activeHero?.id;

            // Check adjacency to active hero for interact
            const isAdjacentToHero = activeHero && distance(activeHero.position, cell) <= 1;

            return (
              <div
                key={key}
                id={`tile-${cell.x}-${cell.y}`}
                onClick={() => {
                  // If dragging was significant, ignore click
                  if (dragDistance.current > 6) return;

                  if (hero) {
                    onSelectHero(hero.id);
                    centerOnCoordinate(hero.position, true);
                  } else if (monster) {
                    onMonsterClick(monster);
                  } else if (chest) {
                    if (isAdjacentToHero && !chest.isOpened) {
                      onInteractTarget('chest', chest.id);
                    } else if (isMoveTarget) {
                      onTileClick(cell);
                    }
                  } else if (cellObj) {
                    if (isAdjacentToHero && !cellObj.isUnlocked) {
                      onInteractTarget('cell', cellObj.id);
                    } else if (isMoveTarget) {
                      onTileClick(cell);
                    }
                  } else if (hoardObj) {
                    if (isAdjacentToHero && !hoardObj.isLooted) {
                      onInteractTarget('treasure_hoard', hoardObj.id);
                    } else if (isMoveTarget) {
                      onTileClick(cell);
                    }
                  } else if (isMoveTarget) {
                    onTileClick(cell);
                  } else if (isRevealed && isWalkable) {
                    onTileClick(cell);
                  }
                }}
                className={`relative rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer overflow-hidden
                  ${!isRevealed 
                    ? 'bg-stone-950 border border-stone-900/60 text-stone-800 hover:border-stone-800' 
                    : isWall
                      ? 'bg-stone-800/90 border border-stone-700 shadow-inner'
                      : isEdge
                        ? 'bg-amber-950/40 border-2 border-dashed border-amber-500/90 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:border-amber-300'
                        : isGilded
                          ? 'bg-amber-950/30 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : isCellTile
                            ? 'bg-stone-900 border-2 border-stone-700'
                            : 'bg-stone-900 border border-stone-800 hover:bg-stone-800/90'
                  }
                  ${isMoveTarget && !hero && !monster ? 'ring-2 ring-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : ''}
                `}
                title={`(${cell.x}, ${cell.y}) ${tile ? `[${tile.kind}]` : '[Unexplored Fog]'}${isMoveTarget ? ' • Click to Move' : ''}`}
              >
                {/* Unexplored Fog Label */}
                {!isRevealed && (
                  <div className="text-[8px] font-mono text-stone-800 tracking-tighter">
                    {cell.x},{cell.y}
                  </div>
                )}

                {/* Edge Coordinate Indicator (Spawning Map Rule Doorway) */}
                {isRevealed && isEdge && !hero && !monster && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-0.5 text-center animate-pulse bg-amber-500/10">
                    <span className="text-amber-400 text-[10px] font-black font-mono tracking-wider">DOOR</span>
                    <span className="text-[7px] text-amber-300 uppercase font-sans font-bold tracking-tight">Enter</span>
                  </div>
                )}

                {/* Move Range Footprint Icon */}
                {isMoveTarget && !hero && !monster && !isEdge && !chest && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-60">
                    <Footprints className="w-4 h-4 text-emerald-400" />
                  </div>
                )}

                {/* Hazard Display (Crumbling floor: completely secret until collapsed into a pit) */}
                {isRevealed && hazard && hazard.state === 'collapsed' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/70 border border-red-800/80 z-10 shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]">
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                      <span className="text-[7px] font-bold uppercase text-red-400 font-mono">Pit</span>
                    </div>
                  </div>
                )}

                {/* Trap Display - only display after it has been triggered (sprung) or disarmed */}
                {isRevealed && trap && (trap.isTriggered || trap.isDisarmed) && (
                  <div className="absolute top-0.5 right-0.5 z-10">
                    <span className="text-[10px] font-bold" title={trap.isDisarmed ? "Disarmed Trap" : "Sprung Trap"}>
                      {trap.isDisarmed ? '🛡️' : '💥'}
                    </span>
                  </div>
                )}

                {/* Chest Object */}
                {isRevealed && chest && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragDistance.current > 6) return;
                      if (isAdjacentToHero && !chest.isOpened) {
                        onInteractTarget('chest', chest.id);
                      } else {
                        onTileClick(cell);
                      }
                    }}
                    className={`relative z-10 flex flex-col items-center justify-center p-1 rounded transition-transform hover:scale-110 cursor-pointer ${
                      chest.isOpened ? 'opacity-30' : 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    }`}
                    title={chest.isOpened ? 'Opened Chest' : `Chest (Click to Open if adjacent or walk closer)`}
                  >
                    <Key className="w-4 h-4 text-amber-400" />
                    <span className="text-[7px] uppercase font-bold text-amber-300 font-mono">
                      {chest.isOpened ? 'Opened' : 'Chest'}
                    </span>
                  </div>
                )}

                {/* Prison Cell Object */}
                {isRevealed && cellObj && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragDistance.current > 6) return;
                      if (isAdjacentToHero && !cellObj.isUnlocked) {
                        onInteractTarget('cell', cellObj.id);
                      } else {
                        onTileClick(cell);
                      }
                    }}
                    className={`relative z-10 flex flex-col items-center justify-center p-1 rounded transition-transform hover:scale-110 cursor-pointer ${
                      cellObj.isUnlocked ? 'opacity-35' : 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                    }`}
                    title={
                      cellObj.isUnlocked 
                        ? `Rescued Captive: ${cellObj.prisonerName}` 
                        : `Prison Cell #${cellObj.cellNumber}: ${cellObj.prisonerName} (+${cellObj.rewardGold} GP) - Click to unlock if adjacent`
                    }
                  >
                    <KeyRound className={`w-4 h-4 ${cellObj.isUnlocked ? 'text-stone-500' : 'text-amber-400 animate-pulse'}`} />
                    <span className="text-[7px] uppercase font-bold text-amber-300 font-mono text-center leading-none mt-0.5">
                      {cellObj.isUnlocked ? 'Saved' : `Cell #${cellObj.cellNumber}`}
                    </span>
                  </div>
                )}

                {/* Treasure Hoard Object */}
                {isRevealed && hoardObj && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragDistance.current > 6) return;
                      if (isAdjacentToHero && !hoardObj.isLooted) {
                        onInteractTarget('treasure_hoard', hoardObj.id);
                      } else {
                        onTileClick(cell);
                      }
                    }}
                    className={`relative z-10 flex flex-col items-center justify-center p-1 rounded transition-transform hover:scale-110 cursor-pointer ${
                      hoardObj.isLooted ? 'opacity-35' : 'text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)] animate-bounce'
                    }`}
                    title={
                      hoardObj.isLooted 
                        ? 'Treasure Hoard (Looted)' 
                        : `Treasure Chamber Hoard: +${hoardObj.goldValue} Gold Pieces! Click to loot before the chamber seals!`
                    }
                  >
                    <Coins className="w-5 h-5 text-amber-400 drop-shadow-md" />
                    <span className="text-[7px] uppercase font-black text-amber-200 font-mono text-center leading-none mt-0.5 bg-amber-950/80 px-1 rounded">
                      {hoardObj.isLooted ? 'Looted' : `+${hoardObj.goldValue} GP`}
                    </span>
                  </div>
                )}

                {/* Boss Crypt Pillar */}
                {isRevealed && pillar && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragDistance.current > 6) return;
                      if (isAdjacentToHero && !pillar.isDeactivated) {
                        onInteractTarget('pillar');
                      } else {
                        onTileClick(cell);
                      }
                    }}
                    className={`relative z-10 flex flex-col items-center justify-center p-0.5 rounded transition-transform hover:scale-110 cursor-pointer ${
                      pillar.isDeactivated ? 'opacity-30' : 'text-purple-400 animate-pulse'
                    }`}
                    title={pillar.isDeactivated ? 'Smashed Pillar' : 'Crypt Pillar (Click to Smash!)'}
                  >
                    <Sparkles className="w-4 h-4 text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]" />
                    <span className="text-[7px] uppercase font-bold text-purple-300 font-mono">
                      {pillar.isDeactivated ? 'Broken' : 'Pillar'}
                    </span>
                  </div>
                )}

                {/* Hero Token */}
                {hero && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragDistance.current > 6) return;
                      onSelectHero(hero.id);
                      centerOnCoordinate(hero.position, true);
                    }}
                    className={`relative z-20 flex flex-col items-center justify-center ${tokenSize} rounded-full border-2 shadow-lg transition-all cursor-pointer ${
                      isHeroSelected 
                        ? 'scale-115 ring-4 ring-amber-400 border-amber-300 bg-stone-900 shadow-amber-500/60 z-30' 
                        : 'border-white/80 bg-stone-900/90 hover:scale-110 hover:ring-2 hover:ring-white/60'
                    }`}
                    style={{ borderColor: hero.color }}
                    title={`${hero.name} (${hero.classType.toUpperCase()}) • HP: ${hero.hp}/${hero.maxHp} • Move: ${hero.turnState.moveRemaining}/${hero.turnState.maxMove} • Click to select & center`}
                  >
                    <span className="leading-none select-none">{hero.portrait}</span>
                    
                    {/* Selected Hero Label Badge */}
                    {isHeroSelected && (
                      <div className="absolute -top-3.5 px-1.5 py-0.2 bg-amber-500 text-stone-950 font-black text-[7px] rounded-full uppercase tracking-tighter shadow-md whitespace-nowrap">
                        ACTIVE
                      </div>
                    )}

                    {/* Active Hero Ping locator ring */}
                    {isHeroSelected && (
                      <div className="absolute -inset-1 rounded-full border-2 border-amber-400/60 animate-ping pointer-events-none" />
                    )}

                    {/* Hero Health Bar Mini */}
                    <div className="absolute -bottom-1.5 w-7 h-1 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                      <div 
                        className="h-full bg-emerald-500 transition-all" 
                        style={{ width: `${Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100))}%` }}
                      />
                    </div>

                    {/* Status Effect Indicator (e.g. Prone in Pit) */}
                    {hero.turnState.statusEffects.some(se => se.id === 'prone') && (
                      <div className="absolute -bottom-4 px-1 py-0.2 bg-red-600 text-white font-black text-[7px] rounded-full uppercase tracking-tighter shadow-md animate-pulse">
                        PRONE
                      </div>
                    )}
                  </div>
                )}

                {/* Monster Token */}
                {monster && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragDistance.current > 6) return;
                      onMonsterClick(monster);
                    }}
                    className={`relative z-20 flex flex-col items-center justify-center ${tokenSize} rounded-lg border-2 shadow-md transition-transform hover:scale-110 cursor-pointer ${
                      monster.isBoss 
                        ? 'border-purple-500 bg-purple-950/80 ring-2 ring-purple-400/60 scale-105' 
                        : 'border-red-600 bg-stone-900/95'
                    }`}
                    title={`${monster.name} [AI: ${monster.ai.behaviorType.toUpperCase()} -> Target: ${monster.ai.targetingRule}] HP: ${monster.hp}/${monster.maxHp} • Click to Attack`}
                  >
                    <span className="leading-none">
                      {monster.monsterType === 'dragon' 
                        ? '🐉' 
                        : monster.monsterType === 'hound_boss' 
                        ? '🐺' 
                        : monster.monsterType === 'hound' 
                        ? '🐕' 
                        : monster.isBoss 
                        ? '👑' 
                        : monster.monsterType === 'skeleton' 
                        ? '💀' 
                        : monster.monsterType === 'goblin' 
                        ? '👺' 
                        : '🕷️'}
                    </span>

                    {/* AI Badge */}
                    <div className="absolute -top-2 px-1 bg-red-950 border border-red-700/80 rounded text-[7px] text-red-300 font-mono tracking-tighter uppercase font-bold">
                      {monster.ai.behaviorType === 'patrol' ? 'Patrol' : monster.ai.behaviorType === 'ambush' ? 'Ambush' : monster.ai.behaviorType === 'boss_phased' ? 'Boss' : 'Chase'}
                    </div>

                    {/* Monster HP Bar */}
                    <div className="absolute -bottom-1.5 w-7 h-1 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                      <div 
                        className={`h-full ${monster.isBoss ? 'bg-purple-500' : 'bg-red-500'} transition-all`}
                        style={{ width: `${Math.max(0, Math.min(100, (monster.hp / monster.maxHp) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      </div>

      {/* FLOATING BOTTOM CONTROLS & STATUS BAR */}
      <div className="absolute bottom-2 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Navigation hint */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-900/85 backdrop-blur-md rounded-lg border border-stone-800 text-[11px] text-stone-400 pointer-events-auto">
          <Move className="w-3.5 h-3.5 text-amber-400" />
          <span>Click & drag map to pan • Zoom out to see all rooms</span>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-stone-900/85 backdrop-blur-md rounded-lg border border-stone-800 text-[11px] text-stone-400 font-sans pointer-events-auto">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-amber-400 bg-stone-900 inline-block" />
            <span>Active Hero</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border border-emerald-400 bg-emerald-950/40 inline-block" />
            <span>Reachable Squares</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border border-dashed border-amber-400 bg-amber-950/40 inline-block" />
            <span>Door</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border border-red-600 bg-stone-900 inline-block" />
            <span>Monster</span>
          </div>
        </div>
      </div>
    </div>
  );
};
