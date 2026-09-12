import { 
  GameEngineState, 
  ModulePackage, 
  HeroCharacter, 
  RoomDataBlock, 
  GridTile, 
  GridCoordinate,
  CombatLogEntry,
  MonsterInstance,
  HazardInstance,
  TrapInstance,
  ClassAbility,
  InventoryItem,
  InitiativeMember,
  NearbyInteractable,
  MonsterInRangeInfo,
  TurnPrompt,
  HoundEventState,
  ShopItem,
  PrisonCellInstance,
  NarrativeChoiceEvent,
  NarrativeChoiceOption
} from '../types/schema';
import { INITIAL_HERO_PARTY } from './heroParty';
import { ALL_MODULES, MODULE_1_CORE_SET } from '../data/modulesData';
import { executeMonsterTurn, distance } from './monsterAI';
import { rollAttack, rollDice, rollSavingThrow } from './dice';
import { generateProceduralRoom } from './proceduralGenerator';
import { TOWN_SHOP_ITEMS } from '../data/shopData';
import { autoSaveSession } from './sessionManager';
import { userAccountManager } from './userAccountManager';

export class TabletopGameEngine {
  private state: GameEngineState;
  private listeners: ((state: GameEngineState) => void)[] = [];

  constructor(modulePackage: ModulePackage = MODULE_1_CORE_SET) {
    this.state = this.initializeState(modulePackage);
  }

  public subscribe(listener: (state: GameEngineState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getState(): GameEngineState {
    return this.state;
  }

  private notify() {
    this.state = {
      ...this.state,
      initiativeList: this.state.initiativeList ? this.state.initiativeList.map(i => ({ ...i })) : [],
      turnPrompt: this.state.turnPrompt ? {
        ...this.state.turnPrompt,
        monstersInRange: this.state.turnPrompt.monstersInRange ? this.state.turnPrompt.monstersInRange.map(m => ({ ...m })) : [],
        nearbyInteractables: this.state.turnPrompt.nearbyInteractables ? this.state.turnPrompt.nearbyInteractables.map(n => ({ ...n })) : []
      } : null,
      heroes: this.state.heroes.map(h => ({
        ...h,
        position: { ...h.position },
        turnState: {
          ...h.turnState,
          statusEffects: [...h.turnState.statusEffects]
        },
        weapons: h.weapons.map(w => ({ ...w })),
        abilities: h.abilities.map(a => ({ ...a })),
        inventory: h.inventory.map(i => ({ ...i }))
      })),
      activeRooms: this.state.activeRooms.map(r => ({
        ...r,
        tiles: r.tiles.map(t => ({ ...t })),
        monsters: r.monsters.map(m => ({
          ...m,
          position: { ...m.position },
          ai: {
            ...m.ai,
            actions: m.ai.actions.map(a => ({ ...a })),
            patrolWaypoints: m.ai.patrolWaypoints ? m.ai.patrolWaypoints.map(p => ({ ...p })) : undefined,
            ambushConfig: m.ai.ambushConfig ? { ...m.ai.ambushConfig } : undefined
          }
        })),
        hazards: r.hazards.map(hz => ({ ...hz, coordinate: { ...hz.coordinate } })),
        traps: r.traps.map(tr => ({ ...tr, coordinate: { ...tr.coordinate } })),
        chests: r.chests.map(ch => ({ ...ch, coordinate: { ...ch.coordinate }, loot: ch.loot.map(l => ({ ...l })) })),
        edgeCoordinates: r.edgeCoordinates.map(ed => ({ ...ed, coordinate: { ...ed.coordinate } }))
      })),
      allTiles: new Map(this.state.allTiles),
      combatLog: [...this.state.combatLog]
    };

    this.listeners.forEach(l => l(this.state));
    try {
      autoSaveSession(this.state);
    } catch (err) {
      // Ignore autosave quota error
    }
  }

  private initializeState(modulePackage: ModulePackage): GameEngineState {
    // Deep clone rooms and heroes
    const clonedPackage: ModulePackage = JSON.parse(JSON.stringify(modulePackage));
    const isSolo = !!clonedPackage.isSoloOnly;
    let initialHeroes: HeroCharacter[];

    if (isSolo) {
      // In solo-only mode, only the champion hero enters the Crucible
      const fullParty: HeroCharacter[] = JSON.parse(JSON.stringify(INITIAL_HERO_PARTY));
      initialHeroes = [fullParty[0]]; // Thorin the Champion Fighter
    } else {
      initialHeroes = JSON.parse(JSON.stringify(INITIAL_HERO_PARTY));
      // Sort heroes strictly by initiative descending (Highest initiative acts first)
      initialHeroes.sort((a, b) => b.initiative - a.initiative);
    }

    const allTiles = new Map<string, GridTile>();
    
    // Only reveal first room initially
    const activeRooms: RoomDataBlock[] = [clonedPackage.rooms[0]];
    clonedPackage.rooms[0].isExplored = true;
    
    clonedPackage.rooms[0].tiles.forEach(t => {
      t.isRevealed = true;
      allTiles.set(`${t.x},${t.y}`, t);
    });

    // Build Initiative Order Queue
    const initiativeList: InitiativeMember[] = initialHeroes.map((h, idx) => ({
      id: h.id,
      name: h.name,
      type: 'hero',
      portrait: h.portrait,
      initiative: h.initiative,
      isCurrentTurn: idx === 0,
      isDone: false,
      isAlive: h.hp > 0
    }));

    initiativeList.push({
      id: 'monsters_group',
      name: 'Monsters Phase',
      type: 'monsters',
      portrait: '💀',
      initiative: 8,
      isCurrentTurn: false,
      isDone: false,
      isAlive: true
    });

    const activeHero = initialHeroes[0];
    const initialPrompt = this.computeTurnPrompt(activeHero, activeRooms.flatMap(r => r.monsters), activeRooms);

    const initialLog: CombatLogEntry = {
      id: `log_init_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: isSolo ? 'Crucible Controller' : 'Initiative Controller',
      action: isSolo ? 'Solo Trial Commenced' : 'Turn Order Set',
      detail: isSolo 
        ? `🔥 SOLO CRUCIBLE COMMENCED: ${activeHero.name} enters alone. Death = zero returns: all spoils collected during this trial are forfeit unless General Vaelok is defeated!`
        : `Initiative Order established: 1. ${initialHeroes.map(h => `${h.name} (${h.initiative})`).join(' ➔ ')} ➔ Monsters (8). Round 1: ${activeHero.name} begins their turn (1 Move, 1 Action, 1 Interact).`,
      type: 'system'
    };

    const initialHoundState: HoundEventState = {
      totalPrisoners: 10,
      rescuedPrisoners: 0,
      houndsReleased: false,
      houndsInChaseMode: false,
      spawnedHoundsCount: 0,
      houndBossSpawned: false,
      houndBossDefeated: false
    };

    const baseStartingGold = 120;
    const userProfile = userAccountManager.getProfile();

    // Apply persistent upgrades to starting party
    userAccountManager.applyPermanentUpgrades(initialHeroes);

    const firstRoom = activeRooms[0];
    const initialChoice = (firstRoom?.choiceEvent && !firstRoom.choiceEvent.isResolved) ? firstRoom.choiceEvent : null;

    return {
      currentModule: clonedPackage,
      currentModuleId: clonedPackage.id,
      turnPhase: 'HERO_TURN',
      currentRound: 1,
      activeHeroIndex: 0,
      heroes: initialHeroes,
      activeRooms,
      allTiles,
      combatLog: [initialLog],
      selectedHeroId: initialHeroes[0].id,
      selectedAction: null,
      initiativeList,
      currentInitiativeIndex: 0,
      turnPrompt: initialPrompt,
      partyGold: baseStartingGold,
      canAccessShop: false, // Mandate: Heroes must defeat the Module Boss to unlock Town Shop & collect rewards!
      bossDefeated: false,
      houndEventState: initialHoundState,
      treasureChamberScenario: undefined,
      isSoloExpedition: isSolo,
      expeditionStartingGold: baseStartingGold,
      expeditionLootCollected: [],
      issuedVouchers: [],
      bloodDebt: userProfile.blood_debt || 0,
      narrativeFlags: [...(userProfile.narrative_flags || [])],
      permanentUpgrades: [...(userProfile.permanent_upgrades || [])],
      memoryItems: [...(userProfile.memory_items || [])],
      activeChoiceEvent: initialChoice,
      gameStats: {
        roomsExplored: 1,
        monstersSlain: 0,
        damageDealt: 0,
        trapsDisarmed: 0,
        chestsOpened: 0,
        goldEarned: baseStartingGold,
        prisonersRescued: 0
      },
      isGameOver: false,
      isVictory: false
    };
  }

  public loadSavedState(newState: GameEngineState, sessionName?: string) {
    this.state = newState;
    if (!(this.state.allTiles instanceof Map)) {
      this.state.allTiles = new Map(Object.entries(this.state.allTiles || {}));
    }
    const activeHero = this.state.heroes[this.state.activeHeroIndex] || this.state.heroes[0];
    const allMonsters = this.state.activeRooms.flatMap(r => r.monsters);
    this.state.turnPrompt = this.computeTurnPrompt(activeHero, allMonsters, this.state.activeRooms);
    this.addLog({
      source: 'Session Restored',
      action: 'Session Loaded',
      detail: `💾 Restored session: "${sessionName || 'Saved Game'}" (Round ${this.state.currentRound}, ${this.state.currentModule.title}). Party Gold: ${this.state.partyGold} GP.`,
      type: 'system'
    });
    this.state.turnNotice = `💾 Session restored: "${sessionName || 'Saved Game'}" (${this.state.currentModule.title}, Round ${this.state.currentRound}). Party is ready for tactical commands!`;
    this.notify();
  }

  public startNewCampaign(moduleId: string) {
    const targetModule = ALL_MODULES.find(m => m.id === moduleId) || MODULE_1_CORE_SET;
    this.state = this.initializeState(targetModule);
    this.addLog({
      source: 'Campaign Controller',
      action: 'New Campaign Started',
      detail: `⚔️ Fresh module session launched: "${targetModule.title}". All rooms reset to pristine module parameters. Mandate: Slay the Module Boss to conquer the module and unlock the Town Shop!`,
      type: 'system'
    });
    this.state.turnNotice = `⚔️ New Campaign started for "${targetModule.title}". Explore all ${targetModule.rooms.length} rooms and defeat the Module Boss!`;
    this.notify();
  }

  public loadModule(moduleId: string, preserveProgression: boolean = true) {
    const existingGold = (preserveProgression && this.state) ? this.state.partyGold : 120;
    const targetModule = ALL_MODULES.find(m => m.id === moduleId) || MODULE_1_CORE_SET;
    this.state = this.initializeState(targetModule);
    if (preserveProgression) {
      this.state.partyGold = existingGold;
    }
    this.notify();
  }

  public restartCurrentModule(preserveProgression: boolean = true) {
    const existingGold = (preserveProgression && this.state) ? this.state.partyGold : 120;
    const targetModule = ALL_MODULES.find(m => m.id === this.state.currentModuleId) || MODULE_1_CORE_SET;
    this.state = this.initializeState(targetModule);
    if (preserveProgression) {
      this.state.partyGold = existingGold;
    }
    this.notify();
  }

  public selectHero(heroId: string) {
    const heroIdx = this.state.heroes.findIndex(h => h.id === heroId && h.hp > 0);
    if (heroIdx !== -1) {
      this.state.activeHeroIndex = heroIdx;
      this.state.selectedHeroId = heroId;
      this.state.selectedAction = null;
      this.state.turnNotice = undefined;

      // Sync initiative list current indicator
      if (this.state.initiativeList) {
        this.state.initiativeList.forEach(item => {
          if (item.type === 'hero') {
            item.isCurrentTurn = (item.id === heroId);
          }
        });
      }

      const hero = this.state.heroes[heroIdx];
      this.updateTurnPrompt();
      this.addLog({
        source: 'Tactical Focus',
        action: `Selected ${hero.name}`,
        detail: `Tactical viewer and active command centered on ${hero.name} (${hero.classType.toUpperCase()}) at (${hero.position.x}, ${hero.position.y}).`,
        type: 'system'
      });
      this.notify();
    }
  }

  public dismissTurnNotice() {
    this.state.turnNotice = undefined;
    this.notify();
  }

  public dismissNotice() {
    this.dismissTurnNotice();
  }

  public computeTurnPrompt(
    hero: HeroCharacter,
    activeMonsters: MonsterInstance[],
    activeRooms: RoomDataBlock[]
  ): TurnPrompt {
    const livingMonsters = activeMonsters.filter(m => m.isAlive);

    // Strict weapon range check: Only include monsters that can ACTUALLY be hit by an equipped weapon
    const monstersInRange: MonsterInRangeInfo[] = [];

    livingMonsters.forEach(m => {
      const dist = distance(hero.position, m.position);
      const capableWeapons = hero.weapons
        .map((w, idx) => ({ weapon: w, index: idx }))
        .filter(entry => dist <= entry.weapon.range);

      if (capableWeapons.length > 0) {
        // Choose best weapon: prefer melee (reach 1) if adjacent, else first capable weapon
        const chosen = (dist <= 1 ? capableWeapons.find(e => e.weapon.range === 1) : null) || capableWeapons[0];
        monstersInRange.push({
          id: m.id,
          name: m.name,
          distance: dist,
          hp: m.hp,
          maxHp: m.maxHp,
          weaponIndex: chosen.index,
          weaponName: chosen.weapon.name,
          weaponRange: chosen.weapon.range
        });
      }
    });

    monstersInRange.sort((a, b) => a.distance - b.distance);

    const canAttack = !hero.turnState.hasActed && hero.turnState.actionsRemaining > 0 && monstersInRange.length > 0;

    const nearbyInteractables: NearbyInteractable[] = [];

    activeRooms.forEach(room => {
      room.chests.forEach(chest => {
        if (!chest.isOpened && distance(hero.position, chest.coordinate) <= 1) {
          nearbyInteractables.push({
            type: 'chest',
            label: 'Treasure Chest (Open to claim loot)',
            id: chest.id
          });
        }
      });

      room.bossEncounter?.pillarsToDeactivate?.forEach(pillar => {
        if (!pillar.isDeactivated && distance(hero.position, pillar.coordinate) <= 1) {
          const isVaelok = room.bossEncounter?.bossName?.includes('Vaelok');
          nearbyInteractables.push({
            type: 'pillar',
            label: isVaelok ? 'Blood Obelisk (Shatter Crimson Aegis)' : 'Crypt Pillar (Smash Bone Shield)'
          });
        }
      });

      if (room.warningStele && distance(hero.position, room.warningStele.coordinate) <= 1) {
        nearbyInteractables.push({
          type: 'stele',
          label: `Read ${room.warningStele.title} (Death = Zero Returns Rules)`
        });
      }

      if (room.restPoint && !room.restPoint.isUsed && distance(hero.position, room.restPoint.coordinate) <= 1) {
        nearbyInteractables.push({
          type: 'rest_point',
          label: `Take Short Rest at ${room.restPoint.name} (+${room.restPoint.hpRestore} HP & Reset Abilities)`
        });
      }

      room.prisonCells?.forEach(cell => {
        if (!cell.isUnlocked && distance(hero.position, cell.coordinate) <= 1) {
          nearbyInteractables.push({
            type: 'cell',
            label: `Prison Cell #${cell.cellNumber}: Rescue ${cell.prisonerName} (+${cell.rewardGold} GP)`,
            id: cell.id,
            cellNumber: cell.cellNumber
          });
        }
      });

      if (room.isTreasureChamber && room.treasureHoard && !room.treasureHoard.isLooted && distance(hero.position, room.treasureHoard.coordinate) <= 1) {
        nearbyInteractables.push({
          type: 'treasure_hoard',
          label: `Plunder Wyrm Hoard (+${room.treasureHoard.goldValue} GP & Draconic Shield)`,
          id: room.treasureHoard.id,
          goldValue: room.treasureHoard.goldValue
        });
      }

      if (room.choiceEvent && !room.choiceEvent.isResolved) {
        const choiceObj = room.interactableObjects?.find(o => o.type === 'choice_event' && !o.isUsed);
        const isNearby = choiceObj ? distance(hero.position, choiceObj.coordinate) <= 1 : true;
        if (isNearby) {
          nearbyInteractables.push({
            type: 'choice_event' as any,
            label: `Confront Dilemma: ${room.choiceEvent.title}`,
            id: room.choiceEvent.id
          });
        }
      }

      room.edgeCoordinates.forEach(edge => {
        if (distance(hero.position, edge.coordinate) <= 1 && !activeRooms.some(r => r.roomIndex === edge.targetRoomIndex && r.isExplored)) {
          nearbyInteractables.push({
            type: 'door',
            label: `Passage doorway to ${edge.targetRoomIndex ? `Room ${edge.targetRoomIndex}` : 'Next Chamber'}`
          });
        }
      });
    });

    if (hero.inventory.some(i => i.type === 'consumable')) {
      nearbyInteractables.push({
        type: 'potion',
        label: 'Potion of Healing (Quaff to restore HP)'
      });
    }

    const canInteract = !hero.turnState.hasInteracted && hero.turnState.interactsRemaining > 0 && nearbyInteractables.length > 0;

    const nearestLivingMonster = livingMonsters
      .map(m => ({ name: m.name, dist: distance(hero.position, m.position) }))
      .sort((a, b) => a.dist - b.dist)[0];

    let phaseStep: 'move' | 'combat' | 'interact' | 'done' = 'move';
    let message = '';

    if (!hero.turnState.hasMoved) {
      phaseStep = 'move';
      if (nearestLivingMonster && monstersInRange.length === 0) {
        message = `1. Move Action: Advance towards ${nearestLivingMonster.name} (${nearestLivingMonster.dist} sq away), or click Hold / Lock Move.`;
      } else {
        const unexploredEdge = activeRooms
          .flatMap(r => r.edgeCoordinates)
          .find(e => !e.isTriggered && !activeRooms.some(ar => ar.roomIndex === e.targetRoomIndex && ar.isExplored));

        if (unexploredEdge) {
          message = `1. Move Action: Advance towards the doorway at (${unexploredEdge.coordinate.x}, ${unexploredEdge.coordinate.y}) [DOOR] to explore the next chamber, or click Hold / Lock Move.`;
        } else {
          message = `1. Move Action: Select a highlighted destination (up to ${hero.speed} squares) or click Hold / Lock Move.`;
        }
      }
    } else if (!hero.turnState.hasActed) {
      phaseStep = 'combat';
      if (canAttack) {
        message = `2. Combat Action: Target in range! ${monstersInRange[0].name} is within ${monstersInRange[0].weaponName} reach (${monstersInRange[0].distance} sq away). Click Strike or Skip.`;
      } else if (nearestLivingMonster) {
        message = `2. Combat Action: ${hero.name} is out of range! Nearest foe (${nearestLivingMonster.name}) is ${nearestLivingMonster.dist} sq away (Max reach: ${Math.max(...hero.weapons.map(w => w.range))} sq). Click Skip Combat.`;
      } else {
        message = `2. Combat Action: No monsters currently in range. You may Skip Combat.`;
      }
    } else if (!hero.turnState.hasInteracted) {
      phaseStep = 'interact';
      if (canInteract) {
        message = `3. Nearby Object/Item Available: ${nearbyInteractables.map(n => n.label).join(', ')}. Interact or Skip.`;
      } else {
        message = `3. Interaction: No interactive objects adjacent. You may Skip Interaction.`;
      }
    } else {
      phaseStep = 'done';
      message = `All turn components completed (Move, Combat, Interact). Click Pass Turn to advance the initiative.`;
    }

    return {
      heroId: hero.id,
      heroName: hero.name,
      phaseStep,
      message,
      canAttack,
      monstersInRange,
      canInteract,
      nearbyInteractables
    };
  }

  public updateTurnPrompt() {
    const hero = this.state.heroes[this.state.activeHeroIndex];
    if (!hero || hero.hp <= 0 || this.state.turnPhase !== 'HERO_TURN') {
      this.state.turnPrompt = null;
      return;
    }
    this.state.turnPrompt = this.computeTurnPrompt(hero, this.getActiveMonsters(), this.state.activeRooms);
  }

  public skipMove(): void {
    const hero = this.state.heroes[this.state.activeHeroIndex];
    if (!hero || hero.turnState.hasMoved) return;

    hero.turnState.hasMoved = true;
    hero.turnState.moveRemaining = 0;

    this.addLog({
      source: hero.name,
      action: 'Hold Position',
      detail: `${hero.name} chooses not to move. [Movement locked as expended for this turn].`,
      type: 'system'
    });

    this.updateTurnPrompt();
    this.notify();
  }

  public skipAction(): void {
    const hero = this.state.heroes[this.state.activeHeroIndex];
    if (!hero || hero.turnState.hasActed) return;

    hero.turnState.hasActed = true;
    hero.turnState.actionsRemaining = 0;

    this.addLog({
      source: hero.name,
      action: 'Combat Skipped',
      detail: `${hero.name} passes their combat action for this turn.`,
      type: 'system'
    });

    this.updateTurnPrompt();
    this.notify();
  }

  public skipInteract(): void {
    const hero = this.state.heroes[this.state.activeHeroIndex];
    if (!hero || hero.turnState.hasInteracted) return;

    hero.turnState.hasInteracted = true;
    hero.turnState.interactsRemaining = 0;

    this.addLog({
      source: hero.name,
      action: 'Interaction Skipped',
      detail: `${hero.name} passes their interaction for this turn.`,
      type: 'system'
    });

    this.updateTurnPrompt();
    this.notify();
  }

  public passTurnToNextHero(): void {
    if (this.state.turnPhase !== 'HERO_TURN') return;

    const currentHero = this.state.heroes[this.state.activeHeroIndex];
    if (currentHero) {
      currentHero.turnState.hasMoved = true;
      currentHero.turnState.moveRemaining = 0;
      currentHero.turnState.hasActed = true;
      currentHero.turnState.actionsRemaining = 0;
      currentHero.turnState.hasInteracted = true;
      currentHero.turnState.interactsRemaining = 0;

      const initEntry = this.state.initiativeList.find(item => item.id === currentHero.id);
      if (initEntry) {
        initEntry.isDone = true;
        initEntry.isCurrentTurn = false;
      }

      this.addLog({
        source: currentHero.name,
        action: 'Turn Concluded',
        detail: `✓ ${currentHero.name} has concluded their turn (1 Move, 1 Action, 1 Interact resolved). Passing to next player in initiative.`,
        type: 'system'
      });
    }

    // Find next living hero in initiative list who has not acted yet
    let nextIdx = -1;
    for (let i = 0; i < this.state.initiativeList.length; i++) {
      const entry = this.state.initiativeList[i];
      if (entry.type === 'hero' && !entry.isDone && entry.isAlive) {
        nextIdx = i;
        break;
      }
    }

    if (nextIdx !== -1) {
      this.state.currentInitiativeIndex = nextIdx;
      this.state.initiativeList.forEach((item, idx) => {
        item.isCurrentTurn = idx === nextIdx;
      });

      const nextHeroId = this.state.initiativeList[nextIdx].id;
      const heroIndex = this.state.heroes.findIndex(h => h.id === nextHeroId);
      if (heroIndex !== -1) {
        this.state.activeHeroIndex = heroIndex;
        this.state.selectedHeroId = nextHeroId;
        this.state.selectedAction = null;
        this.state.turnNotice = undefined;

        this.addLog({
          source: 'Initiative Controller',
          action: 'Next Player Turn',
          detail: `➡️ It is now ${this.state.heroes[heroIndex].name}'s turn (Initiative ${this.state.heroes[heroIndex].initiative}). 1 Move, 1 Action, 1 Interact granted.`,
          type: 'system'
        });
      }
      this.updateTurnPrompt();
      this.notify();
    } else {
      // All living heroes have completed their turn -> Transition to Monster Phase
      this.state.initiativeList.forEach(item => {
        item.isCurrentTurn = item.type === 'monsters';
      });
      this.state.turnPrompt = null;
      this.endPartyTurn();
    }
  }

  public selectAction(action: 'move' | 'attack' | 'ability' | 'interact' | null, abilityId?: string) {
    this.state.selectedAction = action;
    this.state.selectedAbilityId = abilityId;
    this.notify();
  }

  /**
   * Calculates BFS path from start to goal coordinate.
   * Considers obstacles, walls, other heroes, and living monsters.
   */
  public findPath(
    start: GridCoordinate, 
    goal: GridCoordinate, 
    movingHeroId: string
  ): GridCoordinate[] | null {
    if (start.x === goal.x && start.y === goal.y) return [];

    const goalKey = `${goal.x},${goal.y}`;
    const goalTile = this.state.allTiles.get(goalKey);
    if (!goalTile || !goalTile.walkable || !goalTile.isRevealed) return null;

    // Monsters block movement completely (cannot pass through or land on)
    const monsterBlocked = new Set<string>();
    this.getActiveMonsters().forEach(m => {
      if (m.isAlive) {
        monsterBlocked.add(`${m.position.x},${m.position.y}`);
      }
    });

    // Other heroes: can be passed through, but cannot be remained/landed on
    const allyOccupied = new Set<string>();
    this.state.heroes.forEach(h => {
      if (h.id !== movingHeroId && h.hp > 0) {
        allyOccupied.add(`${h.position.x},${h.position.y}`);
      }
    });

    // Destination cannot be an occupied square!
    if (monsterBlocked.has(goalKey) || allyOccupied.has(goalKey)) return null;

    const queue: GridCoordinate[] = [{ ...start }];
    const cameFrom = new Map<string, GridCoordinate | null>();
    const startKey = `${start.x},${start.y}`;
    cameFrom.set(startKey, null);

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: -1 }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.x === goal.x && current.y === goal.y) {
        const path: GridCoordinate[] = [];
        let curr: GridCoordinate | null = current;
        while (curr && !(curr.x === start.x && curr.y === start.y)) {
          path.unshift(curr);
          const parentKey = `${curr.x},${curr.y}`;
          curr = cameFrom.get(parentKey) || null;
        }
        return path;
      }

      for (const dir of dirs) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const nextKey = `${nx},${ny}`;

        if (cameFrom.has(nextKey)) continue;

        const tile = this.state.allTiles.get(nextKey);
        if (!tile || !tile.walkable || !tile.isRevealed) continue;
        // Monsters block movement completely
        if (monsterBlocked.has(nextKey)) continue;

        // Diagonal corner cutting check
        if (dir.dx !== 0 && dir.dy !== 0) {
          const adj1 = this.state.allTiles.get(`${current.x + dir.dx},${current.y}`);
          const adj2 = this.state.allTiles.get(`${current.x},${current.y + dir.dy}`);
          if (adj1 && !adj1.walkable && adj2 && !adj2.walkable) {
            continue;
          }
        }

        cameFrom.set(nextKey, current);
        queue.push({ x: nx, y: ny });
      }
    }

    return null;
  }

  /**
   * Get all coordinates that the active hero can legally reach with their current move pool.
   * Players can pass through ally squares, but cannot remain on a currently occupied square.
   */
  public getReachableCoordinates(): Set<string> {
    const hero = this.state.heroes[this.state.activeHeroIndex];
    if (!hero || hero.hp <= 0 || this.state.turnPhase !== 'HERO_TURN' || hero.turnState.hasMoved || hero.turnState.moveRemaining <= 0) {
      return new Set<string>();
    }

    const reachable = new Set<string>();
    const start = hero.position;
    const maxMove = hero.turnState.moveRemaining;

    // Monsters block movement completely
    const monsterBlocked = new Set<string>();
    this.getActiveMonsters().forEach(m => {
      if (m.isAlive) {
        monsterBlocked.add(`${m.position.x},${m.position.y}`);
      }
    });

    // Other heroes: can be passed through, but CANNOT be landed on
    const allyOccupied = new Set<string>();
    this.state.heroes.forEach(h => {
      if (h.id !== hero.id && h.hp > 0) {
        allyOccupied.add(`${h.position.x},${h.position.y}`);
      }
    });

    // BFS with distance tracking
    const queue: { coord: GridCoordinate; dist: number }[] = [{ coord: start, dist: 0 }];
    const visited = new Map<string, number>();
    visited.set(`${start.x},${start.y}`, 0);

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: -1 }
    ];

    while (queue.length > 0) {
      const { coord, dist } = queue.shift()!;
      if (dist < maxMove) {
        for (const dir of dirs) {
          const nx = coord.x + dir.dx;
          const ny = coord.y + dir.dy;
          const key = `${nx},${ny}`;

          if (visited.has(key)) continue;

          const tile = this.state.allTiles.get(key);
          if (!tile || !tile.walkable || !tile.isRevealed) continue;
          if (monsterBlocked.has(key)) continue;

          // Corner diagonal check
          if (dir.dx !== 0 && dir.dy !== 0) {
            const adj1 = this.state.allTiles.get(`${coord.x + dir.dx},${coord.y}`);
            const adj2 = this.state.allTiles.get(`${coord.x},${coord.y + dir.dy}`);
            if (adj1 && !adj1.walkable && adj2 && !adj2.walkable) {
              continue;
            }
          }

          visited.set(key, dist + 1);

          // Moving hero CAN pass through allies, but CANNOT remain on a currently occupied square!
          if (!allyOccupied.has(key)) {
            reachable.add(key);
          }

          // Push to queue so hero can pass through ally squares to empty squares beyond
          queue.push({ coord: { x: nx, y: ny }, dist: dist + 1 });
        }
      }
    }

    return reachable;
  }

  /**
   * Move the active hero to a target coordinate.
   * Uses BFS pathfinding, traverses intermediate squares, evaluates Spawning Map Rule (edge coords),
   * and triggers hazards/traps.
   */
  public moveActiveHero(target: GridCoordinate): boolean {
    const hero = this.state.heroes[this.state.activeHeroIndex];
    if (!hero || hero.hp <= 0 || this.state.turnPhase !== 'HERO_TURN') return false;
    if (hero.turnState.hasMoved || hero.turnState.moveRemaining <= 0) {
      this.state.turnNotice = `${hero.name} has already taken their 1 move action this turn. Movement is locked.`;
      this.notify();
      return false;
    }

    // Module exploration has begun: lock shop access during active module play
    this.state.canAccessShop = false;

    // Target is already current position
    if (hero.position.x === target.x && hero.position.y === target.y) return false;

    // Moving hero cannot remain on a currently occupied square
    const isOccupiedByHero = this.state.heroes.some(h => h.id !== hero.id && h.hp > 0 && h.position.x === target.x && h.position.y === target.y);
    const isOccupiedByMonster = this.getActiveMonsters().some(m => m.isAlive && m.position.x === target.x && m.position.y === target.y);
    if (isOccupiedByHero || isOccupiedByMonster) {
      this.state.turnNotice = `Cannot end turn on an occupied square. You may pass through allies, but must end on an open square.`;
      this.notify();
      return false;
    }

    // Find path to target
    const path = this.findPath(hero.position, target, hero.id);
    if (!path || path.length === 0) return false;

    // Take up to remaining movement
    const stepsToTake = Math.min(path.length, hero.turnState.moveRemaining);
    if (stepsToTake <= 0) return false;

    const actualPath = path.slice(0, stepsToTake);
    const finalCoord = actualPath[actualPath.length - 1];

    // Ensure final coordinate is not an ally (cannot stop on an ally)
    if (this.state.heroes.some(h => h.id !== hero.id && h.hp > 0 && h.position.x === finalCoord.x && h.position.y === finalCoord.y)) {
      this.state.turnNotice = `Cannot end movement on a square occupied by an ally. Choose an open destination square.`;
      this.notify();
      return false;
    }

    // Deduct movement and lock move action (1 move per turn)
    hero.turnState.hasMoved = true;
    hero.turnState.moveRemaining = 0;

    let stepsCompleted = 0;
    let interrupted = false;

    // Check each step sequentially along the path
    for (const step of actualPath) {
      hero.position = { ...step };
      stepsCompleted++;

      // 1. Spawning Map Rule: "Every time a hero occupies an 'Edge Coordinate', a new room data block initializes."
      this.checkEdgeCoordinateExploration(step, hero);

      // 2. Traps on coordinate
      const trapHalted = this.checkTrapTrigger(step, hero);

      // 3. Hazards on coordinate
      const hazardHalted = this.checkHazardTrigger(step, hero);

      // 4. Narrative Choice Event on coordinate
      this.checkChoiceEventTrigger(step, hero);

      if (trapHalted || hazardHalted || hero.hp <= 0) {
        interrupted = true;
        break;
      }
    }

    this.addLog({
      source: hero.name,
      action: interrupted ? 'Movement Interrupted' : 'Move Completed',
      detail: `${hero.name} navigated ${stepsCompleted} square(s) to (${hero.position.x}, ${hero.position.y})${interrupted ? ' [Halted by pit/hazard!]' : ''}. [1/1 Move action completed & locked].`,
      type: 'move'
    });

    this.updateTurnPrompt();
    this.notify();
    return true;
  }

  /**
   * Spawning Map Rule Implementation:
   * Initializes next room data block when hero occupies edge coordinate.
   */
  private checkEdgeCoordinateExploration(coord: GridCoordinate, hero: HeroCharacter) {
    for (const room of this.state.activeRooms) {
      const edge = room.edgeCoordinates.find(e => 
        !e.isTriggered && 
        e.coordinate.x === coord.x && 
        e.coordinate.y === coord.y
      );

      if (edge) {
        edge.isTriggered = true;
        this.addLog({
          source: 'Spawning Map Rule',
          action: 'Edge Coordinate Occupied!',
          detail: `🌟 ${hero.name} occupied Edge Coordinate (${coord.x}, ${coord.y})! A new Room Data Block is initializing...`,
          type: 'reveal'
        });

        const maxModuleRooms = this.state.currentModule.rooms.length;
        const targetRoomIndex = edge.targetRoomIndex;
        let newRoom: RoomDataBlock | null = null;

        // Check if pre-authored room exists in module package
        if (targetRoomIndex && this.state.currentModule.rooms[targetRoomIndex - 1]) {
          const authoredRoom = this.state.currentModule.rooms[targetRoomIndex - 1];
          // Check if not already added
          if (!this.state.activeRooms.some(r => r.id === authoredRoom.id)) {
            newRoom = JSON.parse(JSON.stringify(authoredRoom));
          }
        }

        // If not found by target index, check if any unrevealed room remains within module parameters
        if (!newRoom && this.state.activeRooms.length < maxModuleRooms) {
          const nextAuthored = this.state.currentModule.rooms.find(
            r => !this.state.activeRooms.some(ar => ar.id === r.id)
          );
          if (nextAuthored) {
            newRoom = JSON.parse(JSON.stringify(nextAuthored));
          }
        }

        // Strict Module Limit Enforcement:
        // Do NOT generate procedural rooms. Prevent running off-course past module parameters.
        if (!newRoom) {
          this.state.turnNotice = `Perimeter Reached: This passage terminates at the module boundary. All ${maxModuleRooms} rooms of ${this.state.currentModule.title} have been revealed! Slay the Module Boss in the Sanctum!`;
          this.addLog({
            source: 'Module Controller',
            action: 'Module Boundary Reached',
            detail: `🧱 Solid stone bulkhead. All ${maxModuleRooms} rooms of ${this.state.currentModule.title} are explored. The party must defeat the Module Boss in the Sanctum!`,
            type: 'system'
          });
          break;
        }

        if (newRoom) {
          newRoom.isExplored = true;
          newRoom.tiles.forEach(t => {
            t.isRevealed = true;
            this.state.allTiles.set(`${t.x},${t.y}`, t);
          });

          this.state.activeRooms.push(newRoom);
          this.state.gameStats.roomsExplored++;

          this.addLog({
            source: 'Exploration Trigger',
            action: 'Room Revealed',
            detail: `🚪 Discovered: "${newRoom.title}" [Theme: ${newRoom.theme}]. ${newRoom.flavorText}`,
            type: 'reveal'
          });

          if (newRoom.isBossRoom && newRoom.bossEncounter) {
            this.addLog({
              source: 'Boss Encounter Trigger',
              action: 'Warning!',
              detail: `⚠️ BOSS ENCOUNTER INITIATED: ${newRoom.bossEncounter.bossName}! Mechanic: ${newRoom.bossEncounter.phaseMechanics[0].mechanicName} - ${newRoom.bossEncounter.phaseMechanics[0].description}`,
              type: 'boss'
            });
          }

          if (newRoom.isTreasureChamber) {
            this.state.treasureChamberScenario = {
              chamberRoomId: newRoom.id,
              isTriggered: true,
              isSealed: false,
              roundsUntilSeal: 3,
              maxRoundsUntilSeal: 3,
              dragonSummoned: false,
              dragonDefeated: false,
              hoardLooted: false,
              totalGoldInVault: newRoom.treasureHoard?.goldValue || 450
            };
            this.state.turnNotice = `⚠️ TREASURE VAULT ENTERED! Alarm runes awaken! You have 3 ROUNDS to loot the hoard and flee before the portcullis seals and Ignis the Red Wyrm descends!`;
            this.addLog({
              source: 'Treasure Chamber Alarm',
              action: 'Vault Countdown Initiated!',
              detail: `⚠️ The vault's alarm runes flare vermilion! You have 3 ROUNDS to loot the ${newRoom.treasureHoard?.goldValue || 450} GP Hoard and escape through the doorway before the portcullis seals and Ignis the Young Red Dragon attacks!`,
              type: 'boss'
            });
          }

          // Narrative Solo Module 5: Narrative Dilemma Choice Trigger
          if (newRoom.choiceEvent && !newRoom.choiceEvent.isResolved) {
            this.state.activeChoiceEvent = newRoom.choiceEvent;
            this.state.turnNotice = `📜 Narrative Dilemma: "${newRoom.choiceEvent.title}"! Choose your path carefully!`;
            this.addLog({
              source: 'Narrative Engine',
              action: `Encountered Dilemma: ${newRoom.choiceEvent.title}`,
              detail: `📜 ${newRoom.choiceEvent.situationText}`,
              type: 'system'
            });
          }

          // Module 5 Act III: Dynamic Boss Metamorphosis based on Act I & II choices
          if (newRoom.id === 'm5_room_6' || (this.state.currentModuleId === 'module_5_blood_debt' && newRoom.isBossRoom)) {
            this.applyDynamicReckoningBoss(newRoom);
          }
        }
        break;
      }
    }
  }

  private checkChoiceEventTrigger(coord: GridCoordinate, hero: HeroCharacter) {
    for (const room of this.state.activeRooms) {
      if (room.choiceEvent && !room.choiceEvent.isResolved) {
        const choiceObj = room.interactableObjects?.find(o => o.type === 'choice_event' && !o.isUsed);
        if (choiceObj && choiceObj.coordinate.x === coord.x && choiceObj.coordinate.y === coord.y) {
          this.state.activeChoiceEvent = room.choiceEvent;
          this.addLog({
            source: 'Narrative Engine',
            action: `Encountered: ${room.choiceEvent.title}`,
            detail: `📜 ${room.choiceEvent.situationText}`,
            type: 'system'
          });
          this.state.turnNotice = `📜 Narrative Choice: "${room.choiceEvent.title}"! Make your decision!`;
          break;
        }
      }
    }
  }

  private applyDynamicReckoningBoss(room: RoomDataBlock) {
    const bossMonster = room.monsters.find(m => m.isBoss || m.id === 'm5_boss_reckoning');
    if (!bossMonster) return;

    const flags = new Set(this.state.narrativeFlags || []);

    if (flags.has('act2_leader_escaped')) {
      // Malakar escaped and rallied vengeance
      bossMonster.name = 'Malakar, Warlord of the Red Vengeance';
      bossMonster.monsterType = 'humanoid';
      bossMonster.hp = 48;
      bossMonster.maxHp = 48;
      bossMonster.ac = 15;
      bossMonster.speed = 6;
      bossMonster.attacks = [
        {
          id: 'atk_malakar_scythes',
          name: 'Twin Scythes of Vengeance',
          range: 1,
          attackBonus: 6,
          damageDice: '2d8+3',
          damageType: 'slashing',
          description: 'Paired curved scythes whirling with crimson hatred.'
        },
        {
          id: 'atk_malakar_bleed',
          name: 'Bleeding Strike',
          range: 1,
          attackBonus: 5,
          damageDice: '1d10+1d6',
          damageType: 'fire',
          description: 'Searing strike ignited by desert oil and bandit rage.'
        }
      ];
      bossMonster.specialAbilities = ['Relentless Outlaw', 'Phase 2: Blood Frenzy (+1d6 damage)'];
      if (room.bossEncounter) {
        room.bossEncounter.bossName = 'Malakar, Warlord of the Red Vengeance';
        room.bossEncounter.distinctCombatMechanic = 'Vengeance Unleashed: Escaped bandit leader returns commanding the Outlaw Horde with high burst agility!';
      }
      this.addLog({
        source: 'RECKONING METAMORPHOSIS',
        action: '⚔️ Boss Identity: Malakar the Warlord!',
        detail: `🔥 CONSEQUENCE OF ACT II: Because you allowed the bandit leader to escape with his bribe, Malakar has rallied his entire syndicate! He enters the arena dual-wielding curved scythes to extinguish your party!`,
        type: 'boss'
      });
      this.state.turnNotice = `⚔️ ACT III BOSS: Malakar, Warlord of the Red Vengeance (48 HP, AC 15)! Consequence of letting him escape in Act II!`;
    } else if (flags.has('act1_survivors_plundered') && flags.has('act2_leader_executed')) {
      // Plundered survivors and slaughtered bandit -> Phantoms seek retribution
      bossMonster.name = 'The Vengeful Wraith of the Unburied';
      bossMonster.monsterType = 'undead';
      bossMonster.hp = 42;
      bossMonster.maxHp = 42;
      bossMonster.ac = 14;
      bossMonster.speed = 6;
      bossMonster.attacks = [
        {
          id: 'atk_wraith_touch',
          name: 'Spectral Reave',
          range: 1,
          attackBonus: 6,
          damageDice: '2d6+4',
          damageType: 'necrotic',
          description: 'Freezing phantom claws that pass straight through mundane armor.'
        },
        {
          id: 'atk_wraith_wail',
          name: 'Wail of the Plundered Dead',
          range: 4,
          attackBonus: 5,
          damageDice: '3d6',
          damageType: 'psychic',
          description: 'An agonizing cacophony of the innocent victims whose supplies you plundered.'
        }
      ];
      bossMonster.specialAbilities = ['Incorporeal Movement', 'Phase 2: Necrotic Torment (+1d6 extra damage)'];
      if (room.bossEncounter) {
        room.bossEncounter.bossName = 'The Vengeful Wraith of the Unburied';
        room.bossEncounter.distinctCombatMechanic = 'Ghostly Retribution: Incorporeal phantom born of the plundered survivors and butchered outlaws!';
      }
      this.addLog({
        source: 'RECKONING METAMORPHOSIS',
        action: '💀 Boss Identity: The Vengeful Wraith!',
        detail: `💀 CONSEQUENCE OF ACT I & II: Because you plundered the starving survivors and ruthlessly executed the bandits, their bitter spirits have coalesced into The Vengeful Wraith of the Unburied!`,
        type: 'boss'
      });
      this.state.turnNotice = `💀 ACT III BOSS: The Vengeful Wraith of the Unburied (42 HP, AC 14)! Consequence of plundering survivors in Act I!`;
    } else if (flags.has('act1_survivors_aided') && flags.has('act2_leader_executed')) {
      // Righteous path -> High Inquisitor / Commander Kaelen tests the party
      bossMonster.name = 'Commander Kaelen, Grand Arbiter of the Debt';
      bossMonster.monsterType = 'humanoid';
      bossMonster.hp = 46;
      bossMonster.maxHp = 46;
      bossMonster.ac = 16;
      bossMonster.speed = 5;
      bossMonster.attacks = [
        {
          id: 'atk_kaelen_radiant',
          name: 'Sunforged Greatsword',
          range: 1,
          attackBonus: 7,
          damageDice: '1d10+4',
          damageType: 'radiant',
          description: 'Heavy gilded greatsword humming with sanctified solar brilliance.'
        },
        {
          id: 'atk_kaelen_smite',
          name: 'Judicial Smite',
          range: 1,
          attackBonus: 6,
          damageDice: '2d8+2',
          damageType: 'force',
          description: 'A crushing downward blow executing legal retribution.'
        }
      ];
      bossMonster.specialAbilities = ['Shield of the High Court', 'Phase 2: Righteous Zeal (+1d6 damage)'];
      if (room.bossEncounter) {
        room.bossEncounter.bossName = 'Commander Kaelen, Grand Arbiter of the Debt';
        room.bossEncounter.distinctCombatMechanic = 'Trial by Combat: Frontier High Inquisitor testing your valor and virtue in lawful battle!';
      }
      this.addLog({
        source: 'RECKONING METAMORPHOSIS',
        action: '⚖️ Boss Identity: Commander Kaelen!',
        detail: `🌟 CONSEQUENCE OF ACT I & II: Word of your mercy toward the survivors and justice against the bandit syndicate reached the High Citadel! Commander Kaelen himself meets you on the arena sands for the final trial of law!`,
        type: 'boss'
      });
      this.state.turnNotice = `⚖️ ACT III BOSS: Commander Kaelen, Grand Arbiter of the Debt (46 HP, AC 16)! Consequence of lawful & merciful deeds!`;
    } else {
      // Default construct arbiter
      this.addLog({
        source: 'RECKONING METAMORPHOSIS',
        action: '⚖️ Boss Identity: The Arbiter of the Blood Debt!',
        detail: `⚖️ The ageless construct guardian of the eternal scales balances your ledger with iron and fire.`,
        type: 'boss'
      });
      this.state.turnNotice = `⚖️ ACT III BOSS: The Arbiter of the Blood Debt (44 HP, AC 15) emerges to balance the scales!`;
    }
  }

  /**
   * Environmental Hazard: Crumbling Floor & Pit Resolution
   * Resolves steps, collapse, damage (1d6 bludgeoning + spikes), DEX save, Prone condition, and halts movement.
   */
  private checkHazardTrigger(coord: GridCoordinate, hero: HeroCharacter): boolean {
    let halt = false;

    for (const room of this.state.activeRooms) {
      const hazard = room.hazards.find(h => h.coordinate.x === coord.x && h.coordinate.y === coord.y);
      if (hazard) {
        // Calculate hero DEX saving throw modifier
        const dexMod = hero.classType === 'rogue' ? 4 : hero.classType === 'wizard' ? 1 : hero.classType === 'fighter' ? 1 : 0;
        const dmgDice = hazard.damageOnTrigger || '1d6';

        if (hazard.state !== 'collapsed') {
          hazard.currentIntegrity -= 1;

          if (hazard.currentIntegrity === 1) {
            hazard.state = 'cracking';
            this.addLog({
              source: hazard.name,
              action: 'Floor Cracking!',
              detail: `⚠️ The stone floor groans and cracks under ${hero.name}'s boots! Spiderweb fractures spread across the slab (1 step remaining before collapse).`,
              type: 'hazard'
            });
            this.state.turnNotice = `⚠️ The floor groans dangerously under ${hero.name}! One more step will cause it to collapse!`;
          } else if (hazard.currentIntegrity <= 0) {
            hazard.state = 'collapsed';
            // Mark tile as hazard/pit on the tactical board
            const tile = this.state.allTiles.get(`${coord.x},${coord.y}`);
            if (tile) {
              tile.kind = 'hazard';
            }

            const save = rollSavingThrow(dexMod, hazard.savingThrowDC);
            const dmg = rollDice(dmgDice);
            // D&D 5e: On failed save, take full 1d6 falling/spike damage and fall Prone in the pit.
            // On successful save, scrape edge while steadying for half damage (min 1).
            const finalDamage = save.success ? Math.max(1, Math.floor(dmg.total / 2)) : dmg.total;
            hero.hp = Math.max(0, hero.hp - finalDamage);

            // Apply Prone status effect if failed save
            if (!save.success) {
              const hasProne = hero.turnState.statusEffects.some(s => s.id === 'prone');
              if (!hasProne) {
                hero.turnState.statusEffects.push({
                  id: 'prone',
                  name: 'Prone (In Pit)',
                  type: 'debuff',
                  durationTurns: 1,
                  description: 'Fallen into 10ft spike pit. Speed halved until climbed out.',
                  statModifiers: { speed: -2, ac: -1 }
                });
              }
            }

            this.addLog({
              source: hazard.name,
              action: save.success ? 'Floor Collapsed (Scrambled Rim)!' : 'Fell into Pit!',
              detail: `💥 The floor collapsed into a 10ft spike pit! 🎲 ${hero.name} rolled DEX save ${save.total} (d20+${dexMod}) vs DC ${hazard.savingThrowDC} (${save.success ? 'Success: Half Damage' : 'FAILED: Full Damage & Knocked Prone'}). Took ${finalDamage} ${hazard.damageType} damage! [HP: ${hero.hp}/${hero.maxHp}]. Movement halted.`,
              damage: { amount: finalDamage, type: hazard.damageType },
              type: 'hazard'
            });

            this.state.turnNotice = `💥 Pit Collapsed! ${hero.name} took ${finalDamage} damage! ${!save.success ? 'Knocked PRONE in the pit!' : 'Scrambled to the rim.'} Movement halted.`;
            halt = true;
          }
        } else {
          // Hazard is ALREADY collapsed into an open pit!
          // Stepping into an open 10-foot pit triggers falling damage & prone effect
          const save = rollSavingThrow(dexMod, hazard.savingThrowDC);
          const dmg = rollDice(dmgDice);
          const finalDamage = save.success ? Math.max(1, Math.floor(dmg.total / 2)) : dmg.total;
          hero.hp = Math.max(0, hero.hp - finalDamage);

          if (!save.success) {
            const hasProne = hero.turnState.statusEffects.some(s => s.id === 'prone');
            if (!hasProne) {
              hero.turnState.statusEffects.push({
                id: 'prone',
                name: 'Prone (In Pit)',
                type: 'debuff',
                durationTurns: 1,
                description: 'Fallen into 10ft spike pit. Speed halved until climbed out.',
                statModifiers: { speed: -2, ac: -1 }
              });
            }
          }

          this.addLog({
            source: hazard.name,
            action: 'Plunged into Open Pit!',
            detail: `💥 ${hero.name} stepped into an open 10ft pit! 🎲 DEX save ${save.total} vs DC ${hazard.savingThrowDC} (${save.success ? 'Half Damage' : 'FAILED: Knocked Prone'}). Took ${finalDamage} ${hazard.damageType} damage! [HP: ${hero.hp}/${hero.maxHp}]. Movement halted.`,
            damage: { amount: finalDamage, type: hazard.damageType },
            type: 'hazard'
          });

          this.state.turnNotice = `💥 ${hero.name} plunged into the open pit, taking ${finalDamage} damage! Movement halted.`;
          halt = true;
        }

        // Check if hero was downed by hazard damage
        if (hero.hp <= 0) {
          this.addLog({
            source: hero.name,
            action: 'Hero Downed!',
            detail: `💀 ${hero.name} succumbed to the pit hazard and fell unconscious at 0 HP!`,
            type: 'hazard'
          });
          const livingHeroes = this.state.heroes.filter(h => h.hp > 0);
          if (livingHeroes.length === 0) {
            this.triggerHeroDefeat('Succumbed to subterranean pitfall hazards.');
          }
        }
      }
    }

    return halt;
  }

  /**
   * Trap Trigger: Land on Coordinate
   */
  private checkTrapTrigger(coord: GridCoordinate, hero: HeroCharacter): boolean {
    let halt = false;

    for (const room of this.state.activeRooms) {
      const trap = room.traps.find(t => !t.isDisarmed && !t.isTriggered && t.coordinate.x === coord.x && t.coordinate.y === coord.y);
      if (trap) {
        trap.isTriggered = true;
        trap.isDetected = true;

        const dexMod = hero.classType === 'rogue' ? 5 : hero.classType === 'wizard' ? 1 : hero.classType === 'fighter' ? 1 : 0;
        const save = rollSavingThrow(dexMod, trap.savingThrowDC);
        const dmg = rollDice(trap.damageDice);
        const finalDamage = save.success ? Math.max(1, Math.floor(dmg.total / 2)) : dmg.total;

        hero.hp = Math.max(0, hero.hp - finalDamage);

        if (trap.type === 'spike_pit' && !save.success) {
          const hasProne = hero.turnState.statusEffects.some(s => s.id === 'prone');
          if (!hasProne) {
            hero.turnState.statusEffects.push({
              id: 'prone',
              name: 'Prone (In Pit)',
              type: 'debuff',
              durationTurns: 1,
              description: 'Fallen into concealed spike pit. Speed halved until climbed out.',
              statModifiers: { speed: -2, ac: -1 }
            });
          }
          halt = true;
        }

        this.addLog({
          source: trap.name,
          action: 'Trap Sprung!',
          detail: `⚡ ${hero.name} stepped onto a concealed pressure mechanism! ${trap.description} 🎲 DEX Save: ${save.total} vs DC ${trap.savingThrowDC} (${save.success ? 'Half damage' : 'Full damage'}). Took ${finalDamage} ${trap.damageType} damage! [HP: ${hero.hp}/${hero.maxHp}].`,
          damage: { amount: finalDamage, type: trap.damageType },
          type: 'trap'
        });

        this.state.turnNotice = `⚡ Trap Sprung! ${hero.name} took ${finalDamage} ${trap.damageType} damage from ${trap.name}!`;

        if (hero.hp <= 0) {
          this.addLog({
            source: hero.name,
            action: 'Hero Downed!',
            detail: `💀 ${hero.name} was incapacitated by a trap at 0 HP!`,
            type: 'trap'
          });
          const livingHeroes = this.state.heroes.filter(h => h.hp > 0);
          if (livingHeroes.length === 0) {
            this.triggerHeroDefeat('Killed by ancient dungeon traps.');
          }
        }
      }
    }

    return halt;
  }

  /**
   * Apply item damage multipliers such as Robe of Conquest-Red (+10%, rounded down).
   */
  public applyDamageMultiplier(hero: HeroCharacter, baseDamage: number): { finalDamage: number; bonus: number } {
    const hasRobeOfConquest = hero.inventory.some(i => i.id === 'robe_of_conquest_red' || i.id === 'shop_robe_conquest_red');
    if (hasRobeOfConquest && baseDamage > 0) {
      const bonus = Math.floor(baseDamage * 0.10);
      return { finalDamage: baseDamage + bonus, bonus };
    }
    return { finalDamage: baseDamage, bonus: 0 };
  }

  /**
   * Trigger hero defeat and enforce "Death = Zero Returns" in Solo Crucible.
   */
  private triggerHeroDefeat(reason?: string) {
    this.state.isGameOver = true;
    this.state.turnPhase = 'DEFEAT';

    if (this.state.currentModuleId === 'module_5_blood_debt' || this.state.currentModule.moduleNumber === 5) {
      // DEATH IN 《BLOOD DEBT》 ENFORCEMENT:
      // Gold earned this run is halved, blood_debt increases by 1,
      // permanent upgrades and narrative items are retained.
      const startingGold = this.state.expeditionStartingGold ?? 120;
      const goldEarnedThisRun = Math.max(0, this.state.partyGold - startingGold);
      const halvedGoldEarned = Math.floor(goldEarnedThisRun / 2);
      const lostGold = goldEarnedThisRun - halvedGoldEarned;

      this.state.partyGold = startingGold + halvedGoldEarned;
      this.state.bloodDebt = (this.state.bloodDebt || 0) + 1;
      userAccountManager.handlePlayerDeath(goldEarnedThisRun);

      this.addLog({
        source: 'BLOOD DEBT ENFORCEMENT',
        action: '🩸 Blood Debt Incurred on Demise',
        detail: `💀 HERO SLAIN: Gold earned this run is halved (-${lostGold} GP forfeited, ${halvedGoldEarned} GP retained). Blood Debt increased by 1 (Total Blood Debt: ${this.state.bloodDebt}). Permanent upgrades and narrative items are retained!`,
        type: 'boss'
      });
      this.state.turnNotice = `🩸 BLOOD DEBT: Gold earned halved (-${lostGold} GP). Blood Debt increased to ${this.state.bloodDebt}. Permanent upgrades and narrative items retained!`;
      return;
    }

    if (this.state.isSoloExpedition) {
      // DEATH = ZERO RETURNS ENFORCEMENT
      const lostLootCount = this.state.expeditionLootCollected?.length || 0;
      const startingGold = this.state.expeditionStartingGold ?? 120;
      const lostGold = Math.max(0, this.state.partyGold - startingGold);

      // Revert party gold to starting baseline
      this.state.partyGold = startingGold;

      // Strip collected expedition items from heroes' inventory
      if (this.state.expeditionLootCollected && this.state.expeditionLootCollected.length > 0) {
        const lostIds = new Set(this.state.expeditionLootCollected.map(l => l.id));
        this.state.heroes.forEach(h => {
          h.inventory = h.inventory.filter(item => !lostIds.has(item.id));
        });
        this.state.expeditionLootCollected = [];
      }

      this.addLog({
        source: 'CRUCIBLE RULES ENFORCEMENT',
        action: '💀 Death = Zero Returns Penalty Enforced!',
        detail: `💀 DEATH = ZERO RETURNS: The champion has fallen! All expedition spoils are forfeited to the dungeon (-${lostGold} GP forfeited, ${lostLootCount} item(s) lost). Party gold restored to baseline ${startingGold} GP.`,
        type: 'boss'
      });
      this.state.turnNotice = `💀 CRUCIBLE DEFEAT: Death = Zero Returns! All ${lostGold} GP and ${lostLootCount} item(s) collected on this expedition have been lost to the abyss!`;
    } else {
      this.addLog({
        source: 'GAME OVER',
        action: 'Party Defeated',
        detail: `💀 All heroes have fallen in battle. ${reason || 'The darkness claims the dungeon.'}`,
        type: 'boss'
      });
      this.state.turnNotice = '💀 All heroes have fallen in battle! Restart crawl or restore a saved session.';
    }
  }

  /**
   * Hero Attack Action
   */
  public executeHeroAttack(monsterId: string, weaponIndex: number = 0): boolean {
    const hero = this.state.heroes[this.state.activeHeroIndex];
    if (!hero || hero.hp <= 0 || hero.turnState.actionsRemaining <= 0) return false;

    const monster = this.getActiveMonsters().find(m => m.id === monsterId && m.isAlive);
    if (!monster) return false;

    let weapon = hero.weapons[weaponIndex] || hero.weapons[0];
    const dist = distance(hero.position, monster.position);
    if (dist > weapon.range) {
      // Check if hero has another equipped weapon that can reach
      const capableWeaponIdx = hero.weapons.findIndex(w => dist <= w.range);
      if (capableWeaponIdx !== -1) {
        weapon = hero.weapons[capableWeaponIdx];
        weaponIndex = capableWeaponIdx;
      } else {
        const maxRange = Math.max(...hero.weapons.map(w => w.range));
        this.addLog({
          source: hero.name,
          action: 'Out of Range',
          detail: `Cannot reach ${monster.name} (Distance: ${dist} sq, ${hero.name}'s max reach: ${maxRange} sq). Move closer to attack!`,
          type: 'attack'
        });
        this.state.turnNotice = `Out of Range! ${hero.name} cannot reach ${monster.name} (${dist} squares away, max weapon reach is ${maxRange} sq). Move closer to attack.`;
        this.notify();
        return false;
      }
    }

    // Check boss shield mechanic
    if (monster.isBoss) {
      const bossRoom = this.state.activeRooms.find(r => r.bossEncounter?.bossMonsterId === monster.id);
      if (bossRoom?.bossEncounter?.pillarsToDeactivate) {
        const activePillars = bossRoom.bossEncounter.pillarsToDeactivate.filter(p => !p.isDeactivated).length;
        if (activePillars > 0) {
          hero.turnState.actionsRemaining -= 1;
          const isVaelok = monster.name.includes('Vaelok') || bossRoom.bossEncounter.bossName?.includes('Vaelok');
          this.addLog({
            source: hero.name,
            action: isVaelok ? 'Attack Deflected by Crimson Aegis!' : 'Attack Deflected by Bone Aegis!',
            detail: isVaelok 
              ? `🛡️ ${hero.name}'s ${weapon.name} struck General Vaelok, but glanced harmlessly off his Crimson Aegis! (Shatter both Blood Obelisks first via Interact action!)`
              : `🛡️ ${hero.name}'s ${weapon.name} struck Malakor, but bounced harmlessly off his Bone Shield! (You must deactivate both Crypt Pillars first via Interact action!)`,
            type: 'boss'
          });
          this.state.turnNotice = isVaelok 
            ? `🛡️ DEFLECTED: General Vaelok is shielded by Blood Obelisks! Shatter both obelisks first!`
            : `🛡️ DEFLECTED: Malakor is protected by Crypt Pillars! Deactivate pillars first!`;
          this.notify();
          return true;
        }
      }
    }

    // Deduct action
    hero.turnState.actionsRemaining = 0;
    hero.turnState.hasActed = true;
    this.state.canAccessShop = false;

    // Roll d20 + attack bonus vs monster AC
    const atkRoll = rollAttack(weapon.attackBonus, monster.ac);

    if (atkRoll.isHit) {
      const dmgRoll = rollDice(weapon.damageDice);
      const isCrit = atkRoll.isCrit;
      let totalDamage = isCrit ? dmgRoll.total * 2 : dmgRoll.total;

      // Check legendary item bonuses
      const hasSunblade = hero.inventory.some(i => i.id === 'loot_legendary_sunblade' || i.id === 'item_sun_shard');
      if (hasSunblade && (monster.monsterType === 'skeleton' || monster.monsterType === 'wraith' || monster.isBoss)) {
        totalDamage += rollDice('1d8').total;
      }

      // Check Robe of Conquest-Red: All damage dealt +10%, rounded down
      const { finalDamage, bonus: robeBonus } = this.applyDamageMultiplier(hero, totalDamage);
      totalDamage = finalDamage;

      monster.hp = Math.max(0, monster.hp - totalDamage);
      this.state.gameStats.damageDealt += totalDamage;

      const robeDetail = robeBonus > 0 ? ` (+${robeBonus} Robe of Conquest bonus [+10%])` : '';

      this.addLog({
        source: hero.name,
        action: `Attack (${weapon.name})`,
        detail: `🎲 Rolled ${atkRoll.d20} + ${atkRoll.modifier} = ${atkRoll.total} vs AC ${monster.ac} (${isCrit ? 'CRITICAL HIT!' : 'HIT!'}) dealing ${totalDamage}${robeDetail} ${weapon.damageType} damage to ${monster.name}! [${monster.hp}/${monster.maxHp} HP]`,
        roll: atkRoll,
        damage: { amount: totalDamage, type: weapon.damageType },
        type: 'damage'
      });

      // General Vaelok Phase 2: Blood-Rage transition at <= 50% HP (19 HP)
      if ((monster.id === 'boss_vaelok' || monster.name.includes('Vaelok')) && monster.hp <= 19 && monster.hp > 0) {
        const bossRoom = this.state.activeRooms.find(r => r.bossEncounter?.bossMonsterId === monster.id);
        if (bossRoom?.bossEncounter && (!bossRoom.bossEncounter.currentPhase || bossRoom.bossEncounter.currentPhase === 1)) {
          bossRoom.bossEncounter.currentPhase = 2;
          monster.ac = 13;
          monster.speed = 6;
          this.addLog({
            source: monster.name,
            action: '🔥 Phase 2: Crimson Blood-Rage!',
            detail: `🔥 General Vaelok enters Blood-Rage! He discards his tower shield, boosting speed to 6 squares, lowering AC to 13, and igniting his blade with fire damage!`,
            type: 'boss'
          });
          this.state.turnNotice = `🔥 BOSS PHASE 2: General Vaelok enters Blood-Rage! Speed increased to 6 squares!`;
        }
      }

      if (monster.hp <= 0) {
        this.handleMonsterDeath(monster);
      }
    } else {
      this.addLog({
        source: hero.name,
        action: `Attack (${weapon.name})`,
        detail: `🎲 Rolled ${atkRoll.d20} + ${atkRoll.modifier} = ${atkRoll.total} vs AC ${monster.ac} (MISS!). The blow glance harmlessly off armor.`,
        roll: atkRoll,
        type: 'attack'
      });
    }

    this.notify();
    return true;
  }

  /**
   * Hero Class Ability Execution
   */
  public executeHeroAbility(ability: ClassAbility, targetCoord?: GridCoordinate): boolean {
    const hero = this.state.heroes[this.state.activeHeroIndex];
    if (!hero || hero.hp <= 0 || ability.currentCooldown > 0) return false;

    if (ability.actionCost === 'action' && hero.turnState.actionsRemaining <= 0) return false;
    if (ability.actionCost === 'bonus' && hero.turnState.bonusActionsRemaining <= 0) return false;

    // Spend cost
    this.state.canAccessShop = false;
    if (ability.actionCost === 'action') {
      hero.turnState.actionsRemaining = 0;
      hero.turnState.hasActed = true;
    }
    if (ability.actionCost === 'bonus') hero.turnState.bonusActionsRemaining -= 1;
    ability.currentCooldown = ability.cooldownTurns;

    if (ability.healAmount) {
      const heal = rollDice(ability.healAmount);
      // Heal self or lowest ally
      let targetHero = hero;
      if (ability.range > 0) {
        targetHero = [...this.state.heroes].filter(h => h.hp > 0).sort((a, b) => a.hp - b.hp)[0] || hero;
      }
      targetHero.hp = Math.min(targetHero.maxHp, targetHero.hp + heal.total);

      this.addLog({
        source: hero.name,
        action: ability.name,
        detail: `✨ Channeled ${ability.name} restoring ${heal.total} Hit Points to ${targetHero.name}! [${targetHero.hp}/${targetHero.maxHp} HP]`,
        type: 'heal'
      });
    } else if (ability.id === 'ab_cunning_action') {
      hero.turnState.moveRemaining += hero.speed;
      this.addLog({
        source: hero.name,
        action: 'Cunning Dash',
        detail: `💨 ${hero.name} dashes swiftly, doubling movement speed (+${hero.speed} squares)!`,
        type: 'move'
      });
    } else if (ability.id === 'ab_action_surge') {
      const targetMonster = this.getActiveMonsters()
        .filter(m => m.isAlive && distance(hero.position, m.position) <= (ability.range || 1))
        .sort((a, b) => distance(hero.position, a.position) - distance(hero.position, b.position))[0];
      if (targetMonster) {
        const rawDmg = rollDice(ability.damageDice || '1d6+3');
        const { finalDamage, bonus } = this.applyDamageMultiplier(hero, rawDmg.total);
        targetMonster.hp = Math.max(0, targetMonster.hp - finalDamage);
        const dx = Math.sign(targetMonster.position.x - hero.position.x);
        const dy = Math.sign(targetMonster.position.y - hero.position.y);
        targetMonster.position = { x: targetMonster.position.x + (dx || 1), y: targetMonster.position.y + dy };

        const bonusTxt = bonus > 0 ? ` (+${bonus} Robe bonus [+10%])` : '';
        this.addLog({
          source: hero.name,
          action: 'Shield Bash',
          detail: `🛡️ ${hero.name} slams heavy shield into ${targetMonster.name} for ${finalDamage}${bonusTxt} bludgeoning damage and knocks them back! [${targetMonster.hp}/${targetMonster.maxHp} HP]`,
          damage: { amount: finalDamage, type: 'bludgeoning' },
          type: 'damage'
        });
        if (targetMonster.hp <= 0) {
          this.handleMonsterDeath(targetMonster);
        }
      } else {
        this.addLog({
          source: hero.name,
          action: 'Shield Brace',
          detail: `🛡️ ${hero.name} braces behind the tower shield, ready to repel assault!`,
          type: 'system'
        });
      }
    } else if (ability.id === 'ab_sneak_attack') {
      const targetMonster = this.getActiveMonsters()
        .filter(m => m.isAlive && distance(hero.position, m.position) <= (ability.range || 5))
        .sort((a, b) => distance(hero.position, a.position) - distance(hero.position, b.position))[0];
      if (targetMonster) {
        const rawDmg = rollDice(ability.damageDice || '2d6+3');
        const { finalDamage, bonus } = this.applyDamageMultiplier(hero, rawDmg.total);
        targetMonster.hp = Math.max(0, targetMonster.hp - finalDamage);
        const bonusTxt = bonus > 0 ? ` (+${bonus} Robe bonus [+10%])` : '';
        this.addLog({
          source: hero.name,
          action: 'Shadow Snipe (Sneak Attack)',
          detail: `🎯 ${hero.name} looses an arrow directly into ${targetMonster.name}'s weak point for ${finalDamage}${bonusTxt} piercing damage! [${targetMonster.hp}/${targetMonster.maxHp} HP]`,
          damage: { amount: finalDamage, type: 'piercing' },
          type: 'damage'
        });
        if (targetMonster.hp <= 0) {
          this.handleMonsterDeath(targetMonster);
        }
      }
    } else if (ability.id === 'ab_firebolt') {
      const targetMonster = this.getActiveMonsters()
        .filter(m => m.isAlive && distance(hero.position, m.position) <= (ability.range || 5))
        .sort((a, b) => distance(hero.position, a.position) - distance(hero.position, b.position))[0];
      if (targetMonster) {
        const rawDmg = rollDice(ability.damageDice || '1d10+1');
        const { finalDamage, bonus } = this.applyDamageMultiplier(hero, rawDmg.total);
        targetMonster.hp = Math.max(0, targetMonster.hp - finalDamage);
        const bonusTxt = bonus > 0 ? ` (+${bonus} Robe bonus [+10%])` : '';
        this.addLog({
          source: hero.name,
          action: 'Firebolt Cantrip',
          detail: `🔥 ${hero.name} hurls an arcane firebolt at ${targetMonster.name} dealing ${finalDamage}${bonusTxt} fire damage! [${targetMonster.hp}/${targetMonster.maxHp} HP]`,
          damage: { amount: finalDamage, type: 'fire' },
          type: 'damage'
        });
        if (targetMonster.hp <= 0) {
          this.handleMonsterDeath(targetMonster);
        }
      }
    } else if (ability.id === 'ab_sacred_flame') {
      const targetMonster = this.getActiveMonsters()
        .filter(m => m.isAlive && distance(hero.position, m.position) <= (ability.range || 5))
        .sort((a, b) => distance(hero.position, a.position) - distance(hero.position, b.position))[0];
      if (targetMonster) {
        const rawDmg = rollDice(ability.damageDice || '1d8+1');
        const { finalDamage, bonus } = this.applyDamageMultiplier(hero, rawDmg.total);
        targetMonster.hp = Math.max(0, targetMonster.hp - finalDamage);
        const bonusTxt = bonus > 0 ? ` (+${bonus} Robe bonus [+10%])` : '';
        this.addLog({
          source: hero.name,
          action: 'Sacred Flame Cantrip',
          detail: `☀️ Radiant light descends upon ${targetMonster.name} for ${finalDamage}${bonusTxt} radiant damage! [${targetMonster.hp}/${targetMonster.maxHp} HP]`,
          damage: { amount: finalDamage, type: 'radiant' },
          type: 'damage'
        });
        if (targetMonster.hp <= 0) {
          this.handleMonsterDeath(targetMonster);
        }
      }
    } else if (ability.id === 'ab_magic_missile') {
      // Find nearest living monster
      const targetMonster = this.getActiveMonsters().filter(m => m.isAlive).sort((a, b) => distance(hero.position, a.position) - distance(hero.position, b.position))[0];
      if (targetMonster) {
        const rawDmg = rollDice('3d4+3');
        const { finalDamage, bonus } = this.applyDamageMultiplier(hero, rawDmg.total);
        targetMonster.hp = Math.max(0, targetMonster.hp - finalDamage);
        const bonusTxt = bonus > 0 ? ` (+${bonus} Robe bonus [+10%])` : '';
        this.addLog({
          source: hero.name,
          action: 'Magic Missile (Unerring Force)',
          detail: `🔮 3 luminous force darts streak infallibly into ${targetMonster.name} for ${finalDamage}${bonusTxt} force damage! [${targetMonster.hp}/${targetMonster.maxHp} HP]`,
          damage: { amount: finalDamage, type: 'force' },
          type: 'damage'
        });
        if (targetMonster.hp <= 0) {
          this.handleMonsterDeath(targetMonster);
        }
      }
    } else if (ability.id === 'ab_burning_hands') {
      // Blast in front of wizard
      const monstersInBlast = this.getActiveMonsters().filter(m => m.isAlive && distance(hero.position, m.position) <= 3);
      this.addLog({
        source: hero.name,
        action: 'Burning Hands Blast',
        detail: `🔥 A roaring fan of flames engulfs the area!`,
        type: 'damage'
      });
      monstersInBlast.forEach(m => {
        const rawDmg = rollDice('3d6');
        const { finalDamage, bonus } = this.applyDamageMultiplier(hero, rawDmg.total);
        m.hp = Math.max(0, m.hp - finalDamage);
        const bonusTxt = bonus > 0 ? ` (+${bonus} Robe bonus [+10%])` : '';
        this.addLog({
          source: hero.name,
          action: 'Burning Hands Strike',
          detail: `🔥 ${m.name} scorched for ${finalDamage}${bonusTxt} fire damage! [${m.hp}/${m.maxHp} HP]`,
          damage: { amount: finalDamage, type: 'fire' },
          type: 'damage'
        });
        if (m.hp <= 0) {
          this.handleMonsterDeath(m);
        }
      });
    }

    this.notify();
    return true;
  }

  /**
   * Hero Interact Action: Open Chest, Disarm Trap, Deactivate Pillar, Drink Potion, Door, Stele, Rest Point, Choice Event
   */
  public executeInteract(targetType: 'chest' | 'trap' | 'pillar' | 'potion' | 'door' | 'cell' | 'treasure_hoard' | 'stele' | 'rest_point' | 'choice_event', targetId?: string): boolean {
    const hero = this.state.heroes[this.state.activeHeroIndex];
    if (!hero || hero.hp <= 0 || hero.turnState.interactsRemaining <= 0) return false;

    // Any interaction in module locks town shop
    this.state.canAccessShop = false;

    if (targetType === 'chest') {
      // Find chest adjacent
      for (const room of this.state.activeRooms) {
        const chest = room.chests.find(c => !c.isOpened && distance(hero.position, c.coordinate) <= 1);
        if (chest) {
          hero.turnState.interactsRemaining = 0;
          hero.turnState.hasInteracted = true;
          chest.isOpened = true;
          this.state.gameStats.chestsOpened++;

          const goldReward = chest.goldReward || (Math.floor(Math.random() * 25) + 35);
          this.state.partyGold += goldReward;
          this.state.gameStats.goldEarned += goldReward;

          const lootNames = chest.loot.map(l => `${l.name} (${l.rarity})`).join(', ');
          hero.inventory.push(...chest.loot);

          // In solo mode, track expedition-collected loot
          if (this.state.isSoloExpedition) {
            if (!this.state.expeditionLootCollected) this.state.expeditionLootCollected = [];
            this.state.expeditionLootCollected.push(...chest.loot);
          }

          this.addLog({
            source: hero.name,
            action: 'Chest Opened',
            detail: `🎁 Opened ornate chest! Found +${goldReward} GP and discovered: ${lootNames}. Items & gold added to hero's pack!`,
            type: 'system'
          });
          this.state.turnNotice = `🎁 Chest Opened! +${goldReward} Gold Coins and ${chest.loot.length} item(s) collected!`;
          this.updateTurnPrompt();
          this.notify();
          return true;
        }
      }
    } else if (targetType === 'stele') {
      // Examine Blood Stele of the Crucible
      for (const room of this.state.activeRooms) {
        const isNearbyWarningStele = room.warningStele && distance(hero.position, room.warningStele.coordinate) <= 1;
        const steleObj = room.interactableObjects?.find(obj => obj.type === 'stele' && !obj.isUsed && distance(hero.position, obj.coordinate) <= 1);
        if (isNearbyWarningStele || steleObj) {
          hero.turnState.interactsRemaining = 0;
          hero.turnState.hasInteracted = true;
          if (steleObj) steleObj.isUsed = true;

          // Grant tactical warding blessing
          if (!hero.turnState.statusEffects.some(s => s.id === 'crucible_resolve')) {
            hero.turnState.statusEffects.push({
              id: 'crucible_resolve',
              name: 'Crucible Resolve',
              type: 'buff',
              durationTurns: 5,
              description: 'Carved runes steel your mind against fear. +1 AC and +2 on Attack rolls.',
              statModifiers: { ac: 1, attackRollBonus: 2 }
            });
          }

          const steleMsg = room.warningStele?.message || 'ONLY THE CONQUEROR BEARS THE RED MANTLE. DEATH STRIPS ALL SPOILS.';
          const steleTitle = room.warningStele?.title || 'Stele of Ultimatum';
          this.addLog({
            source: hero.name,
            action: `Deciphered ${steleTitle}`,
            detail: `📜 "${steleMsg}" Ancient crimson runes pulse with determination! ${hero.name} gains Crucible Resolve (+1 AC, +2 Attack for 5 turns)!`,
            type: 'system'
          });
          this.state.turnNotice = `📜 Runes Deciphered: "${steleTitle}". ${hero.name} gained Crucible Resolve (+1 AC, +2 Atk)!`;
          this.updateTurnPrompt();
          this.notify();
          return true;
        }
      }
    } else if (targetType === 'rest_point') {
      // Rest at Sanctuary Rest Point
      for (const room of this.state.activeRooms) {
        const isNearbyRestPoint = room.restPoint && !room.restPoint.isUsed && distance(hero.position, room.restPoint.coordinate) <= 1;
        const restObj = room.interactableObjects?.find(obj => obj.type === 'rest_point' && !obj.isUsed && distance(hero.position, obj.coordinate) <= 1);
        if (isNearbyRestPoint || restObj) {
          hero.turnState.interactsRemaining = 0;
          hero.turnState.hasInteracted = true;
          if (room.restPoint) room.restPoint.isUsed = true;
          if (restObj) restObj.isUsed = true;

          const healAmount = Math.min(hero.maxHp - hero.hp, 14);
          hero.hp = Math.min(hero.maxHp, hero.hp + healAmount);
          hero.abilities.forEach(a => { a.currentCooldown = 0; });

          const shrineName = room.restPoint?.name || 'Dawn Altar';
          this.addLog({
            source: hero.name,
            action: `Sanctuary Rest (${shrineName})`,
            detail: `🕯️ The warm light of the ${shrineName} revives the weary champion! Recovered +${healAmount} HP [${hero.hp}/${hero.maxHp}] and all tactical abilities are fully refreshed!`,
            type: 'heal'
          });
          this.state.turnNotice = `🕯️ Sanctuary Rest: Recovered +${healAmount} HP and refreshed all cooldowns!`;
          this.updateTurnPrompt();
          this.notify();
          return true;
        }
      }
    } else if (targetType === 'trap') {
      // Disarm adjacent detected trap
      for (const room of this.state.activeRooms) {
        const trap = room.traps.find(t => !t.isDisarmed && distance(hero.position, t.coordinate) <= 1);
        if (trap) {
          hero.turnState.interactsRemaining = 0;
          hero.turnState.hasInteracted = true;
          const disarmBonus = hero.classType === 'rogue' ? 6 : 2;
          const disarmRoll = rollAttack(disarmBonus, trap.disarmDC);

          if (disarmRoll.isHit) {
            trap.isDisarmed = true;
            this.state.gameStats.trapsDisarmed++;
            this.addLog({
              source: hero.name,
              action: 'Trap Disarmed!',
              detail: `🛠️ Precision work! 🎲 Rolled ${disarmRoll.total} vs DC ${trap.disarmDC} (SUCCESS!). ${trap.name} safely disabled.`,
              type: 'system'
            });
          } else {
            this.addLog({
              source: hero.name,
              action: 'Disarm Attempt Failed',
              detail: `⚠️ 🎲 Rolled ${disarmRoll.total} vs DC ${trap.disarmDC} (FAILED). The mechanism remains primed!`,
              type: 'system'
            });
          }
          this.updateTurnPrompt();
          this.notify();
          return true;
        }
      }
    } else if (targetType === 'cell') {
      // Unlock Prison Cell
      for (const room of this.state.activeRooms) {
        const cell = room.prisonCells?.find(c => !c.isUnlocked && (targetId ? c.id === targetId : distance(hero.position, c.coordinate) <= 1));
        if (cell) {
          hero.turnState.interactsRemaining = 0;
          hero.turnState.hasInteracted = true;
          cell.isUnlocked = true;
          this.state.partyGold += cell.rewardGold;
          this.state.gameStats.goldEarned += cell.rewardGold;
          this.state.gameStats.prisonersRescued += 1;
          this.state.houndEventState.rescuedPrisoners += 1;
          const count = this.state.houndEventState.rescuedPrisoners;

          this.addLog({
            source: hero.name,
            action: `Rescued ${cell.prisonerName}!`,
            detail: `🔓 Cell #${cell.cellNumber} unlocked! "${cell.flavorQuote}" Party rewarded +${cell.rewardGold} GP! [Total Rescued: ${count}/10 Prisoners]`,
            type: 'heal'
          });
          this.state.turnNotice = `🔓 Rescued ${cell.prisonerName}! (${count}/10 Prisoners Saved, +${cell.rewardGold} GP)`;

          this.evaluateHoundEventTriggers(cell, room);
          this.updateTurnPrompt();
          this.notify();
          return true;
        }
      }
    } else if (targetType === 'treasure_hoard') {
      // Plunder Treasure Chamber Vault Hoard
      for (const room of this.state.activeRooms) {
        if (room.isTreasureChamber && room.treasureHoard && !room.treasureHoard.isLooted && distance(hero.position, room.treasureHoard.coordinate) <= 1) {
          hero.turnState.interactsRemaining = 0;
          hero.turnState.hasInteracted = true;
          room.treasureHoard.isLooted = true;
          const gold = room.treasureHoard.goldValue || 450;
          this.state.partyGold += gold;
          this.state.gameStats.goldEarned += gold;

          if (this.state.treasureChamberScenario) {
            this.state.treasureChamberScenario.hoardLooted = true;
          }

          if (room.treasureHoard.legendaryItem) {
            hero.inventory.push(JSON.parse(JSON.stringify(room.treasureHoard.legendaryItem)));
          }

          this.addLog({
            source: hero.name,
            action: 'Plundered Dragon\'s Hoard!',
            detail: `💰 Plundered ${gold} Gold Coins and the legendary ${room.treasureHoard.legendaryItem?.name || 'Draconic Aegis Shield'}! Escape through the doorway before the chamber seals!`,
            type: 'system'
          });
          this.state.turnNotice = `💰 Vault Plundered! +${gold} GP and ${room.treasureHoard.legendaryItem?.name || 'Draconic Shield'} secured! Escape before the doors seal!`;

          this.updateTurnPrompt();
          this.notify();
          return true;
        }
      }
    } else if (targetType === 'pillar') {
      // Deactivate boss pillar / Blood Obelisk
      for (const room of this.state.activeRooms) {
        if (room.bossEncounter?.pillarsToDeactivate) {
          const pillar = room.bossEncounter.pillarsToDeactivate.find(p => !p.isDeactivated && distance(hero.position, p.coordinate) <= 1);
          if (pillar) {
            hero.turnState.interactsRemaining = 0;
            hero.turnState.hasInteracted = true;
            pillar.isDeactivated = true;

            const remaining = room.bossEncounter.pillarsToDeactivate.filter(p => !p.isDeactivated).length;
            const isVaelok = room.bossEncounter.bossMonsterId === 'boss_vaelok' || room.bossEncounter.bossName?.includes('Vaelok');

            this.addLog({
              source: hero.name,
              action: isVaelok ? 'Blood Obelisk Shattered!' : 'Crypt Pillar Smashed!',
              detail: isVaelok 
                ? `⚡ Shattered resonance Blood Obelisk! ${remaining > 0 ? `${remaining} obelisk(s) remain before General Vaelok's Crimson Aegis falls.` : `🎉 ALL BLOOD OBELISKS SHATTERED! General Vaelok's Crimson Aegis has collapsed! He is now vulnerable to attacks!`}`
                : `⚡ Smashed dark resonant Crypt Pillar! ${remaining > 0 ? `${remaining} pillar(s) remain before Malakor's shield falls.` : `🎉 ALL PILLARS SMASHED! Malakor's Bone Shield has shattered! He is now vulnerable to attacks!`}`,
              type: 'boss'
            });
            this.updateTurnPrompt();
            this.notify();
            return true;
          }
        }
      }
    } else if (targetType === 'potion') {
      const potIndex = hero.inventory.findIndex(i => i.type === 'consumable');
      if (potIndex !== -1) {
        const item = hero.inventory[potIndex];
        hero.turnState.interactsRemaining = 0;
        hero.turnState.hasInteracted = true;
        const heal = item.effect === 'heal_2d4_4' ? rollDice('2d4+4') : rollDice('2d4+2');
        hero.hp = Math.min(hero.maxHp, hero.hp + heal.total);
        hero.inventory.splice(potIndex, 1);

        this.addLog({
          source: hero.name,
          action: 'Quaffed Potion',
          detail: `🧪 Quaffed ${item.name} regaining ${heal.total} HP! [${hero.hp}/${hero.maxHp} HP]`,
          type: 'heal'
        });
        this.updateTurnPrompt();
        this.notify();
        return true;
      }
    } else if (targetType === 'door') {
      for (const room of this.state.activeRooms) {
        const edge = room.edgeCoordinates.find(e => 
          !e.isTriggered && 
          distance(hero.position, e.coordinate) <= 1 &&
          !this.state.activeRooms.some(r => r.roomIndex === edge.targetRoomIndex && r.isExplored)
        );
        if (edge) {
          hero.turnState.interactsRemaining = 0;
          hero.turnState.hasInteracted = true;
          this.checkEdgeCoordinateExploration(edge.coordinate, hero);
          this.updateTurnPrompt();
          this.notify();
          return true;
        }
      }
    } else if (targetType === 'choice_event') {
      for (const room of this.state.activeRooms) {
        if (room.choiceEvent && !room.choiceEvent.isResolved) {
          hero.turnState.interactsRemaining = 0;
          hero.turnState.hasInteracted = true;
          this.state.activeChoiceEvent = room.choiceEvent;
          this.addLog({
            source: 'Narrative Engine',
            action: `Confronting: ${room.choiceEvent.title}`,
            detail: `📜 ${room.choiceEvent.situationText}`,
            type: 'system'
          });
          this.state.turnNotice = `📜 Narrative Choice: "${room.choiceEvent.title}"! Make your decision!`;
          this.updateTurnPrompt();
          this.notify();
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Resolve player's choice in a Narrative Choice Modal event
   */
  public resolveChoiceOption(option: NarrativeChoiceOption) {
    const event = this.state.activeChoiceEvent;
    if (!event) return;

    event.isResolved = true;
    event.chosenOptionId = option.id;
    this.state.activeChoiceEvent = null;

    if (!this.state.narrativeFlags) this.state.narrativeFlags = [];
    if (!this.state.narrativeFlags.includes(option.flagToSet)) {
      this.state.narrativeFlags.push(option.flagToSet);
    }
    userAccountManager.addNarrativeFlag(option.flagToSet);

    if (option.goldChange) {
      this.state.partyGold += option.goldChange;
      this.state.gameStats.goldEarned += Math.max(0, option.goldChange);
    }

    // Mark room choiceEvent and interactableObjects as used
    for (const room of this.state.activeRooms) {
      if (room.choiceEvent?.id === event.id) {
        room.choiceEvent.isResolved = true;
        room.choiceEvent.chosenOptionId = option.id;
      }
      const obj = room.interactableObjects?.find(o => o.type === 'choice_event');
      if (obj) obj.isUsed = true;
    }

    this.addLog({
      source: 'Narrative Consequence',
      action: `Decided: ${option.text}`,
      detail: `⚖️ "${option.consequenceSummary}" (Flag Recorded: [${option.flagToSet}]${option.goldChange ? `, Gold: +${option.goldChange} GP` : ''}).`,
      type: 'system'
    });

    this.state.turnNotice = `⚖️ Consequence Recorded: "${option.text}". ${option.consequenceSummary}`;
    this.updateTurnPrompt();
    this.notify();
  }

  /**
   * Dismiss the narrative choice modal without finalizing
   */
  public dismissChoiceEvent() {
    this.state.activeChoiceEvent = null;
    this.notify();
  }

  /**
   * Complete party turn and trigger automated Monster AI round.
   */
  public endPartyTurn() {
    this.state.turnPhase = 'MONSTER_TURN';
    this.addLog({
      source: 'Turn Engine',
      action: 'Party Turn Ended',
      detail: `⚔️ Hero party concludes actions for Round ${this.state.currentRound}. Entering Algorithmic Monster AI Phase...`,
      type: 'system'
    });
    this.notify();

    // Execute Monster turns deterministically
    setTimeout(() => {
      this.executeMonsterPhase();
    }, 400);
  }

  private executeMonsterPhase() {
    const monsters = this.getActiveMonsters().filter(m => m.isAlive);
    const activeBossEncounter = this.state.activeRooms.find(r => r.bossEncounter)?.bossEncounter;

    for (const monster of monsters) {
      const result = executeMonsterTurn(
        monster,
        this.state.heroes,
        this.state.allTiles,
        this.getActiveHazards(),
        activeBossEncounter
      );

      // Apply updates
      Object.assign(monster, result.updatedMonster);
      this.state.heroes = result.updatedHeroes;
      result.logs.forEach(l => this.addLog(l));
    }

    // Check party wipe
    const livingHeroes = this.state.heroes.filter(h => h.hp > 0);
    if (livingHeroes.length === 0) {
      this.triggerHeroDefeat('Slain by dungeon monsters.');
      this.notify();
      return;
    }

    // Reset Hero turn states for new round
    this.state.currentRound += 1;

    // Advance Treasure Chamber Countdown if triggered
    if (this.state.treasureChamberScenario && !this.state.treasureChamberScenario.isSealed) {
      this.state.treasureChamberScenario.roundsUntilSeal -= 1;
      const remaining = this.state.treasureChamberScenario.roundsUntilSeal;

      if (remaining > 0) {
        this.addLog({
          source: 'Treasure Chamber Alarm',
          action: 'Vault Countdown',
          detail: `⏳ ${remaining} Round remaining before the Dragon Vault portcullis seals shut! Grab the loot and evacuate!`,
          type: 'boss'
        });
        this.state.turnNotice = `⏳ VAULT COUNTDOWN: ${remaining} Round remaining before the door seals! Loot the hoard and escape!`;
      } else {
        this.state.treasureChamberScenario.isSealed = true;
        this.sealTreasureChamberAndSummonDragon();
      }
    }

    this.state.heroes.forEach(h => {
      // Process debuffs / status effects duration
      h.turnState.statusEffects = h.turnState.statusEffects
        .map(eff => ({ ...eff, durationTurns: eff.durationTurns - 1 }))
        .filter(eff => eff.durationTurns > 0);

      const speedDebuff = h.turnState.statusEffects.reduce((acc, eff) => acc + (eff.statModifiers?.speed || 0), 0);
      const effectiveSpeed = Math.max(1, h.speed + speedDebuff);

      h.turnState.hasMoved = false;
      h.turnState.hasActed = false;
      h.turnState.hasInteracted = false;
      h.turnState.moveRemaining = effectiveSpeed;
      h.turnState.maxMove = effectiveSpeed;
      h.turnState.actionsRemaining = 1;
      h.turnState.bonusActionsRemaining = 1;
      h.turnState.interactsRemaining = 1;
      h.turnState.hasDashed = false;
      h.abilities.forEach(ab => {
        if (ab.currentCooldown > 0) ab.currentCooldown -= 1;
      });
    });

    // Reset initiative list
    this.state.initiativeList.forEach(item => {
      if (item.type === 'hero') {
        const hero = this.state.heroes.find(h => h.id === item.id);
        item.isAlive = hero ? hero.hp > 0 : true;
        item.isDone = false;
        item.isCurrentTurn = false;
      } else {
        item.isDone = false;
        item.isCurrentTurn = false;
      }
    });

    const firstHeroIdx = this.state.initiativeList.findIndex(item => item.type === 'hero' && item.isAlive);
    if (firstHeroIdx !== -1) {
      this.state.currentInitiativeIndex = firstHeroIdx;
      this.state.initiativeList[firstHeroIdx].isCurrentTurn = true;
      const firstHeroId = this.state.initiativeList[firstHeroIdx].id;
      const heroIdx = this.state.heroes.findIndex(h => h.id === firstHeroId);
      this.state.activeHeroIndex = heroIdx !== -1 ? heroIdx : 0;
      this.state.selectedHeroId = firstHeroId;
    }

    this.state.turnPhase = 'HERO_TURN';
    this.updateTurnPrompt();
    this.addLog({
      source: 'Initiative Controller',
      action: `Round ${this.state.currentRound} Begins`,
      detail: `☀️ Heroes recover full Action, Move, and Interact points. Order resets to top of initiative: ${this.state.heroes[this.state.activeHeroIndex].name}!`,
      type: 'system'
    });
    this.notify();
  }

  public getActiveMonsters(): MonsterInstance[] {
    return this.state.activeRooms.flatMap(r => r.monsters);
  }

  public getActiveHazards(): HazardInstance[] {
    return this.state.activeRooms.flatMap(r => r.hazards);
  }

  public getActiveTraps(): TrapInstance[] {
    return this.state.activeRooms.flatMap(r => r.traps);
  }

  public isShopAccessible(): boolean {
    return !!this.state.canAccessShop;
  }

  public buyShopItem(itemId: string, heroId: string): boolean {
    if (!this.state.canAccessShop) {
      const boss = this.state.activeRooms.flatMap(r => r.monsters).find(m => m.isBoss && m.isAlive);
      const bossName = boss ? boss.name : 'the Module Boss';
      this.state.turnNotice = `🔒 Mandate: Heroes must defeat ${bossName} to collect the module completion rewards and unlock the Town Shop!`;
      this.notify();
      return false;
    }

    const item = TOWN_SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    if (this.state.partyGold < item.cost) {
      this.state.turnNotice = `Insufficient Gold! Need ${item.cost} GP (Party has ${this.state.partyGold} GP).`;
      this.notify();
      return false;
    }

    const hero = this.state.heroes.find(h => h.id === heroId) || this.state.heroes[0];
    this.state.partyGold -= item.cost;

    if (item.category === 'permanent_upgrade') {
      const upgradeId = item.permanentUpgradeId || item.id;
      userAccountManager.addPermanentUpgrade(upgradeId);
      userAccountManager.applyPermanentUpgrades(this.state.heroes);
      if (!this.state.permanentUpgrades) this.state.permanentUpgrades = [];
      if (!this.state.permanentUpgrades.includes(upgradeId)) {
        this.state.permanentUpgrades.push(upgradeId);
      }
      this.addLog({
        source: 'Town Reliquary',
        action: 'Permanent Upgrade Acquired',
        detail: `✨ Acquired Permanent Account Upgrade: ${item.name}! ${item.permanentUpgradeEffect || item.description}. Permanently retained across sessions and deaths. [Remaining Gold: ${this.state.partyGold} GP]`,
        type: 'heal'
      });
      this.state.turnNotice = `✨ Permanent Upgrade Active: ${item.name}! (${this.state.partyGold} GP left)`;
      this.notify();
      return true;
    }

    if (item.category === 'memory_item') {
      const memoryId = item.memoryItemId || item.id;
      userAccountManager.addMemoryItem(memoryId);
      if (!this.state.memoryItems) this.state.memoryItems = [];
      if (!this.state.memoryItems.includes(memoryId)) {
        this.state.memoryItems.push(memoryId);
      }
      this.addLog({
        source: 'Memory Reliquary',
        action: 'Narrative Memory Item Acquired',
        detail: `📜 Acquired Narrative Memory: ${item.name}! Lore unlocked: "${item.narrativeUnlockSnippet || item.description}". Zero impact on combat balance; unlocks text and endings! [Remaining Gold: ${this.state.partyGold} GP]`,
        type: 'system'
      });
      this.state.turnNotice = `📜 Memory Item Acquired: ${item.name}! Lore unlocked! (${this.state.partyGold} GP left)`;
      this.notify();
      return true;
    }

    if (item.weaponUpgrade) {
      hero.weapons.unshift(JSON.parse(JSON.stringify(item.weaponUpgrade)));
    }
    if (item.statBonus) {
      if (item.statBonus.ac) hero.ac += item.statBonus.ac;
      if (item.statBonus.speed) hero.speed += item.statBonus.speed;
      if (item.statBonus.maxHp) {
        hero.maxHp += item.statBonus.maxHp;
        hero.hp = Math.min(hero.maxHp, hero.hp + item.statBonus.maxHp);
      }
    }
    if (item.consumableItem) {
      hero.inventory.push(JSON.parse(JSON.stringify(item.consumableItem)));
    }

    this.addLog({
      source: 'Town Outfitter & Alchemist',
      action: 'Purchased Gear',
      detail: `🪙 Purchased ${item.name} (${item.cost} GP) for ${hero.name}! ${item.description} [Remaining Gold: ${this.state.partyGold} GP]`,
      type: 'system'
    });
    this.state.turnNotice = `🪙 Acquired ${item.name} for ${hero.name}! (${this.state.partyGold} GP left)`;
    this.notify();
    return true;
  }

  private handleMonsterDeath(monster: MonsterInstance) {
    monster.isAlive = false;
    this.state.gameStats.monstersSlain++;
    this.addLog({
      source: 'Turn Engine',
      action: 'Monster Slain',
      detail: `💀 ${monster.name} collapsed in defeat! Earned ${monster.experienceReward} XP.`,
      type: 'system'
    });

    // Case 1: Hound slain -> Check if all hounds are dead to spawn Hound Boss
    if (monster.monsterType === 'hound') {
      const activeRoom = this.state.activeRooms.find(r => r.monsters.some(m => m.id === monster.id)) || this.state.activeRooms[0];
      this.checkHoundBossSpawn(activeRoom, monster.position);
    }

    // Case 2: Hound Boss slain -> Distinct from Module Boss
    if (monster.monsterType === 'hound_boss' || monster.id === 'hound_boss_gorefang') {
      this.state.houndEventState.houndBossDefeated = true;
      const bounty = 200;
      this.state.partyGold += bounty;
      this.state.gameStats.goldEarned += bounty;
      this.addLog({
        source: 'Victory Over the Alpha',
        action: '🐺 Hound Boss Vanquished!',
        detail: `🏆 Gorefang the Alpha Dreadhound falls lifeless! The captives are protected! Collected +${bounty} GP Guild Bounty!`,
        type: 'boss'
      });
      this.state.turnNotice = `🐺 GOREFANG SLAIN! The Dreadhound Alpha has been crushed! Rescued prisoners cheer! (+${bounty} GP Bounty)`;
    }

    // Case 3: Dragon slain -> Opens vault portcullis & awards bounty
    if (monster.monsterType === 'dragon' || monster.id === 'dragon_ignis') {
      if (this.state.treasureChamberScenario) {
        this.state.treasureChamberScenario.dragonDefeated = true;
      }
      const dragonBounty = 350;
      this.state.partyGold += dragonBounty;
      this.state.gameStats.goldEarned += dragonBounty;

      // Re-open chamber doorway
      const chamber = this.state.activeRooms.find(r => r.id === this.state.treasureChamberScenario?.chamberRoomId);
      chamber?.tiles.forEach(t => {
        if (t.x === 13 && t.y === 2) {
          t.kind = 'edge';
          t.walkable = true;
        }
      });

      this.addLog({
        source: 'Dragon Slain',
        action: '🐉 Ignis the Red Wyrm Defeated!',
        detail: `🏆 Ignis the Gilded Wyrm crashes to the vault floor in a storm of embers! The portcullis lock shatters open, restoring escape route! (+${dragonBounty} GP)`,
        type: 'boss'
      });
      this.state.turnNotice = `🐉 DRAGON SLAIN! Ignis has fallen! The portcullis unbars, granting freedom! (+${dragonBounty} GP Bounty)`;
    }

    // Case 4: Module Boss Defeated -> Mandate Fulfilled: Module Victory, Bounty Collected, Town Shop Unlocked!
    const isModuleBoss = monster.isBoss && (
      monster.id === 'boss_malakor' ||
      monster.id === 'boss_broodmother' ||
      monster.id === 'boss_valgoth' ||
      monster.id === 'boss_vaelok' ||
      monster.id.includes('malakor') ||
      monster.id.includes('broodmother') ||
      monster.id.includes('shelob') ||
      monster.id.includes('valgoth') ||
      monster.id.includes('vaelok') ||
      monster.ai.behaviorType === 'boss_phased'
    );

    if (isModuleBoss) {
      const remainingBosses = this.state.activeRooms
        .flatMap(r => r.monsters)
        .filter(m => m.isBoss && m.isAlive && m.id !== monster.id);

      if (remainingBosses.length === 0) {
        this.state.isVictory = true;
        this.state.bossDefeated = true;
        this.state.turnPhase = 'VICTORY';
        this.state.canAccessShop = true; // Shop mandate unlocked upon defeating the boss!

        const moduleVictoryBounty = this.state.currentModule.id === 'mod_crimson_crucible' ? 450 : 350;
        this.state.partyGold += moduleVictoryBounty;
        this.state.gameStats.goldEarned += moduleVictoryBounty;

        // Long rest recovery for surviving heroes
        this.state.heroes.forEach(h => {
          if (h.hp > 0) h.hp = h.maxHp;
          h.abilities.forEach(a => { a.currentCooldown = 0; });
        });

        // Issue Voucher if module has completionRewards
        if (this.state.currentModule.completionRewards?.voucherId) {
          const voucher = {
            id: `voucher_${Date.now()}`,
            code: `CRUCIBLE-WIN-${Date.now().toString(36).toUpperCase()}`,
            moduleId: this.state.currentModule.id,
            voucherId: this.state.currentModule.completionRewards.voucherId,
            redeemableItem: this.state.currentModule.completionRewards.unlocksShopItem,
            isRedeemed: false,
            issuedAt: new Date().toISOString()
          };
          if (!this.state.issuedVouchers) this.state.issuedVouchers = [];
          this.state.issuedVouchers.push(voucher);

          const hero = this.state.heroes[0];
          if (hero) {
            hero.inventory.push({
              id: voucher.voucherId,
              name: 'Crucible Triumph Voucher',
              type: 'quest',
              description: 'Official seal of victory over the Crimson Crucible. Redeemable at the Town Outfitter for the Robe of Conquest-Red!',
              rarity: 'legendary',
              quantity: 1
            });
          }

          this.addLog({
            source: 'VOUCHER ISSUANCE',
            action: 'Crucible Voucher Awarded!',
            detail: `🎟️ PROOF OF CONQUEST: Issued Crucible Triumph Voucher [${voucher.code}]! Present this voucher at the Town Outfitter to redeem the Robe of Conquest-Red!`,
            type: 'boss'
          });
        }

        // Settle solo expedition
        if (this.state.isSoloExpedition) {
          const lootCount = this.state.expeditionLootCollected?.length || 0;
          this.addLog({
            source: 'SETTLEMENT ENGINE',
            action: 'Crucible Expedition Settled (Victory)',
            detail: `👑 SOLO EXPEDITION CLEAR: The lone champion has conquered the Crimson Crucible! All ${lootCount} collected items and ${this.state.partyGold} GP have been safely secured.`,
            type: 'boss'
          });
        }

        this.addLog({
          source: 'VICTORY MANDATE',
          action: 'Module Boss Slayed!',
          detail: `🏆 Magnificent triumph! The party has defeated ${monster.name} and conquered ${this.state.currentModule.title}! Claimed +${moduleVictoryBounty} GP Victory Bounty. The passage to town is secured—Town Outfitter & Alchemist are now OPEN to spend your rewards!`,
          type: 'boss'
        });
        this.state.turnNotice = `🏆 VICTORY MANDATE FULFILLED! ${monster.name} has fallen! Conquered ${this.state.currentModule.title}! Claimed +${moduleVictoryBounty} GP Bounty. Town Outfitter & Alchemist are now OPEN!`;
      }
    }
  }

  private evaluateHoundEventTriggers(cell: PrisonCellInstance, room: RoomDataBlock) {
    const houndState = this.state.houndEventState;
    const rescued = houndState.rescuedPrisoners;

    // Trigger 1: 3/10 prisoners rescued -> Release 1 Hound on Patrol
    if (rescued >= 3 && !houndState.houndsReleased) {
      houndState.houndsReleased = true;
      houndState.spawnedHoundsCount += 1;

      const walkableCoords = room.tiles.filter(t => t.walkable && t.kind !== 'wall');
      const p1 = walkableCoords[walkableCoords.length - 2] ? { x: walkableCoords[walkableCoords.length - 2].x, y: walkableCoords[walkableCoords.length - 2].y } : { x: cell.coordinate.x + 2, y: cell.coordinate.y };

      const hound1: MonsterInstance = {
        id: `hound_patrol_${Date.now()}_1`,
        templateId: 'dreadhound',
        name: 'Shadow Dreadhound Scout (Patrol)',
        monsterType: 'hound',
        tier: 1,
        hp: 14,
        maxHp: 14,
        ac: 12,
        speed: 6,
        position: p1,
        isAlive: true,
        ai: {
          behaviorType: 'patrol',
          targetingRule: 'nearest',
          preferredRange: 1,
          patrolWaypoints: [p1, { x: p1.x + 2, y: p1.y }, { x: p1.x, y: p1.y + 2 }],
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 5 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d6+2', hitBonus: 4 }
          ]
        },
        attacks: [
          { id: 'hound_bite_1', name: 'Rabid Bite', range: 1, attackBonus: 4, damageDice: '1d6+2', damageType: 'piercing', description: 'Vicious snapping jaws.' }
        ],
        specialAbilities: ['Pack Tactics', 'Scent Tracking'],
        statusEffects: [],
        threatLevel: 1,
        experienceReward: 60
      };

      room.monsters.push(hound1);

      this.addLog({
        source: 'Prison Kennel Mechanism',
        action: '🚨 Dreadhound Released on Patrol!',
        detail: `🚨 3/10 Prisoners Rescued! The kennel unlatches and 1 Shadow Dreadhound Scout prowls on PATROL! Keep your distance to avoid notice!`,
        type: 'boss'
      });
      this.state.turnNotice = `🚨 KENNEL UNLATCHED! 3/10 Prisoners rescued! 1 Shadow Dreadhound Scout (14 HP, AC 12) prowls on PATROL!`;
    }

    // Trigger 2: 7/10 prisoners rescued -> Switch existing hound to chase mode + spawn 1 Tracker hound (total 2 hounds in chase mode)
    if (rescued >= 7 && !houndState.houndsInChaseMode) {
      houndState.houndsInChaseMode = true;
      houndState.spawnedHoundsCount += 1;

      // Switch existing living hounds to chase mode
      this.getActiveMonsters().forEach(m => {
        if (m.monsterType === 'hound' && m.isAlive) {
          m.ai.behaviorType = 'chase';
          m.ai.targetingRule = 'nearest';
          m.name = m.name.replace('(Patrol)', '(CHASE MODE)');
        }
      });

      // Spawn 1 Tracker hound in chase mode
      const walkableCoords = room.tiles.filter(t => t.walkable && t.kind !== 'wall');
      const p2 = walkableCoords[0] ? { x: walkableCoords[0].x, y: walkableCoords[0].y } : { x: cell.coordinate.x + 1, y: cell.coordinate.y + 1 };

      const hound2: MonsterInstance = {
        id: `hound_chase_${Date.now()}_2`,
        templateId: 'dreadhound',
        name: 'Shadow Dreadhound Tracker (CHASE MODE)',
        monsterType: 'hound',
        tier: 1,
        hp: 15,
        maxHp: 15,
        ac: 12,
        speed: 6,
        position: p2,
        isAlive: true,
        ai: {
          behaviorType: 'chase',
          targetingRule: 'nearest',
          preferredRange: 1,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 5 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d6+2', hitBonus: 4 }
          ]
        },
        attacks: [
          { id: 'hound_bite_2', name: 'Rabid Bite', range: 1, attackBonus: 4, damageDice: '1d6+2', damageType: 'piercing', description: 'Vicious snapping jaws.' }
        ],
        specialAbilities: ['Pack Tactics', 'Relentless Pursuit'],
        statusEffects: [],
        threatLevel: 1,
        experienceReward: 65
      };

      room.monsters.push(hound2);

      this.addLog({
        source: 'Hound Pack Frenzy',
        action: '🔥 Hounds Enter Chase Mode!',
        detail: `🔥 7/10 Prisoners Rescued! Hounds catch the scent and enter CHASE MODE! 1 additional Dreadhound Tracker enters the hunt (2 Hounds in pursuit)!`,
        type: 'boss'
      });
      this.state.turnNotice = `🔥 RELENTLESS CHASE! 7/10 Prisoners rescued! Hounds switch to Chase Mode! Defend the rescued captives!`;
    }

    // Trigger 3: 10/10 prisoners rescued OR all spawned hounds defeated -> Spawn Hound Boss
    this.checkHoundBossSpawn(room, cell.coordinate);
  }

  private checkHoundBossSpawn(room: RoomDataBlock, fallbackCoord: GridCoordinate) {
    const houndState = this.state.houndEventState;
    if (houndState.houndBossSpawned) return;

    const allHounds = this.getActiveMonsters().filter(m => m.monsterType === 'hound');
    const livingHounds = allHounds.filter(m => m.isAlive).length;
    const allHoundsDead = houndState.spawnedHoundsCount > 0 && livingHounds === 0;

    if (houndState.rescuedPrisoners >= 10 || allHoundsDead) {
      houndState.houndBossSpawned = true;

      const walkableCoords = room.tiles.filter(t => t.walkable && t.kind !== 'wall');
      const bossPos = walkableCoords[Math.floor(walkableCoords.length / 2)] ? { x: walkableCoords[Math.floor(walkableCoords.length / 2)].x, y: walkableCoords[Math.floor(walkableCoords.length / 2)].y } : fallbackCoord;

      const alphaBoss: MonsterInstance = {
        id: `hound_boss_gorefang`,
        templateId: 'alpha_dreadhound_gorefang',
        name: 'Gorefang, The Alpha Dreadhound',
        monsterType: 'hound_boss',
        tier: 2,
        hp: 28,
        maxHp: 28,
        ac: 13,
        speed: 6,
        position: bossPos,
        isAlive: true,
        isBoss: true,
        ai: {
          behaviorType: 'boss_phased',
          targetingRule: 'nearest',
          preferredRange: 1,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 5 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d8+2', hitBonus: 5 }
          ]
        },
        attacks: [
          { id: 'alpha_crush', name: 'Jaws of the Alpha', range: 1, attackBonus: 5, damageDice: '1d8+2', damageType: 'piercing', description: 'Bone-crushing dreadbite.' },
          { id: 'alpha_howl', name: 'Pack Howl', range: 3, attackBonus: 4, damageDice: '1d6+1', damageType: 'necrotic', description: 'Paralyzing ultrasonic baying.' }
        ],
        specialAbilities: ['Alpha Dominance', 'Rabid Frenzy'],
        statusEffects: [],
        threatLevel: 3,
        experienceReward: 250
      };

      room.monsters.push(alphaBoss);

      this.addLog({
        source: 'The Alpha Dreadhound',
        action: '🐺 GOREFANG SPAWNED!',
        detail: `🐺 ${houndState.rescuedPrisoners >= 10 ? 'All 10 Prisoners rescued!' : 'All patrol hounds destroyed!'} The kennel master Gorefang, Alpha Dreadhound has burst into the chamber!`,
        type: 'boss'
      });
      this.state.turnNotice = `🐺 THE ALPHA AWAKENS! Gorefang the Alpha Dreadhound (28 HP, AC 13) has appeared! Slay the Alpha to secure the crypt!`;
    }
  }

  private sealTreasureChamberAndSummonDragon() {
    const scenario = this.state.treasureChamberScenario;
    if (!scenario || scenario.dragonSummoned) return;

    scenario.dragonSummoned = true;
    const chamber = this.state.activeRooms.find(r => r.id === scenario.chamberRoomId);

    // Turn edge doorway into locked iron portcullis / wall
    chamber?.tiles.forEach(t => {
      if (t.x === 13 && t.y === 2) {
        t.kind = 'wall';
        t.walkable = false;
      }
    });

    const dragonPos = { x: (chamber?.origin.x || 13) + 3, y: (chamber?.origin.y || 0) + 3 };

    const dragon: MonsterInstance = {
      id: 'dragon_ignis',
      templateId: 'young_red_dragon',
      name: 'Ignis, The Gilded Wyrm',
      monsterType: 'dragon',
      tier: 2,
      hp: 34,
      maxHp: 34,
      ac: 13,
      speed: 6,
      position: dragonPos,
      isAlive: true,
      isBoss: true,
      ai: {
        behaviorType: 'boss_phased',
        targetingRule: 'nearest',
        preferredRange: 2,
        actions: [
          { triggerCondition: 'always', actionType: 'move', moveDistance: 4 },
          { triggerCondition: 'in_attack_range', actionType: 'special_ability', attackRange: 3, specialAbilityName: 'Fire Breath', damageDice: '2d6', hitBonus: 4 },
          { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d8+3', hitBonus: 5 }
        ]
      },
      attacks: [
        { id: 'dragon_bite', name: 'Molten Maw', range: 1, attackBonus: 5, damageDice: '1d8+3', damageType: 'piercing', description: 'Fangs glowing with superheated volcanic fire.' },
        { id: 'dragon_breath', name: 'Dragonbreath Blast', range: 3, attackBonus: 4, damageDice: '2d6', damageType: 'fire', description: 'A blast of dragon flame.' }
      ],
      specialAbilities: ['Dragonbreath AoE', 'Draconic Terror'],
      statusEffects: [],
      threatLevel: 4,
      experienceReward: 350
    };

    chamber?.monsters.push(dragon);

    this.addLog({
      source: 'Vault Mechanism',
      action: '🔥 Portcullis Crashes Shut & Dragon Summoned!',
      detail: `🔥 CLANG! The heavy iron portcullis slams shut, sealing the exit! A terrifying draconic roar shakes the vault: Ignis the Gilded Wyrm swoops down from the gold-lined ceiling!`,
      type: 'boss'
    });

    this.state.turnNotice = `🔥 THE PORTCULLIS HAS SEALED! You are trapped in the Vault! Ignis the Gilded Wyrm (34 HP, AC 13) attacks! Defeat the dragon to break the portcullis!`;
  }

  /**
   * Instantiate and add a validated custom character token into the tactical party.
   */
  public addImportedHero(data: {
    name: string;
    characterClass: string;
    level: number;
    abilities: {
      strength: number;
      dexterity: number;
      constitution: number;
      intelligence: number;
      wisdom: number;
      charisma: number;
    };
  }): HeroCharacter {
    const rawClass = (data.characterClass || 'fighter').toLowerCase();
    const classType: 'fighter' | 'wizard' | 'rogue' | 'cleric' = 
      rawClass.includes('wiz') || rawClass.includes('sorc') || rawClass.includes('mage') ? 'wizard' :
      rawClass.includes('rogue') || rawClass.includes('ranger') || rawClass.includes('monk') ? 'rogue' :
      rawClass.includes('cleric') || rawClass.includes('paladin') || rawClass.includes('druid') ? 'cleric' : 'fighter';

    const conMod = Math.floor(((data.abilities?.constitution || 10) - 10) / 2);
    const dexMod = Math.floor(((data.abilities?.dexterity || 10) - 10) / 2);
    const strMod = Math.floor(((data.abilities?.strength || 10) - 10) / 2);
    const intMod = Math.floor(((data.abilities?.intelligence || 10) - 10) / 2);
    const wisMod = Math.floor(((data.abilities?.wisdom || 10) - 10) / 2);

    const hitDie = classType === 'fighter' ? 10 : classType === 'cleric' ? 8 : classType === 'rogue' ? 8 : 6;
    const baseHp = hitDie + conMod + Math.max(0, (data.level - 1) * (Math.floor(hitDie / 2) + 1 + conMod));
    const maxHp = Math.max(10, baseHp);
    const ac = classType === 'fighter' ? 16 : classType === 'cleric' ? 15 : classType === 'rogue' ? 14 + Math.min(2, dexMod) : 11 + dexMod;

    const firstHero = this.state.heroes[0];
    const currentRoom = this.state.activeRooms[0];
    const walkableTiles = currentRoom?.tiles.filter(t => t.walkable && t.kind !== 'wall') || [];
    const occupied = new Set(this.state.heroes.map(h => `${h.position.x},${h.position.y}`));
    const spawnTile = walkableTiles.find(t => !occupied.has(`${t.x},${t.y}`)) || (firstHero ? { x: firstHero.position.x, y: firstHero.position.y } : { x: 2, y: 3 });

    const newHero: HeroCharacter = {
      id: `hero_custom_${Date.now()}`,
      name: data.name,
      classType,
      hp: maxHp,
      maxHp,
      ac,
      speed: 6,
      initiative: 10 + dexMod,
      position: { x: spawnTile.x, y: spawnTile.y },
      portrait: classType === 'fighter' ? '🛡️' : classType === 'wizard' ? '🧙' : classType === 'rogue' ? '🗡️' : '✨',
      color: classType === 'fighter' ? '#3b82f6' : classType === 'wizard' ? '#a855f7' : classType === 'rogue' ? '#eab308' : '#10b981',
      turnState: {
        moveRemaining: 6,
        maxMove: 6,
        hasMoved: false,
        actionsRemaining: 1,
        hasActed: false,
        interactsRemaining: 1,
        hasInteracted: false,
        bonusActionsRemaining: 1,
        hasDashed: false,
        statusEffects: []
      },
      weapons: classType === 'fighter' ? [
        { id: `w_${Date.now()}_1`, name: 'Bastard Sword', range: 1, attackBonus: 3 + strMod, damageDice: '1d10+3', damageType: 'slashing', description: 'Heavy forged steel blade.' },
        { id: `w_${Date.now()}_2`, name: 'Javelin', range: 4, attackBonus: 2 + strMod, damageDice: '1d6+2', damageType: 'piercing', description: 'Throwing spear.' }
      ] : classType === 'wizard' ? [
        { id: `w_${Date.now()}_1`, name: 'Arcane Quarterstaff', range: 1, attackBonus: 1 + strMod, damageDice: '1d6+1', damageType: 'bludgeoning', description: 'Carved runes.' },
        { id: `w_${Date.now()}_2`, name: 'Ray of Frost', range: 5, attackBonus: 3 + intMod, damageDice: '1d8', damageType: 'force', description: 'Freezing blast.' }
      ] : classType === 'rogue' ? [
        { id: `w_${Date.now()}_1`, name: 'Stiletto Rapier', range: 1, attackBonus: 3 + dexMod, damageDice: '1d8+3', damageType: 'piercing', description: 'Precision needle point.' },
        { id: `w_${Date.now()}_2`, name: 'Recurve Bow', range: 5, attackBonus: 3 + dexMod, damageDice: '1d6+3', damageType: 'piercing', description: 'Silent composite bow.' }
      ] : [
        { id: `w_${Date.now()}_1`, name: 'Warhammer of Light', range: 1, attackBonus: 3 + strMod, damageDice: '1d8+2', damageType: 'bludgeoning', description: 'Blessed war hammer.' },
        { id: `w_${Date.now()}_2`, name: 'Sacred Bolt', range: 4, attackBonus: 3 + wisMod, damageDice: '1d8', damageType: 'radiant', description: 'Sunburst.' }
      ],
      abilities: [
        {
          id: classType === 'fighter' ? 'ab_action_surge' : classType === 'wizard' ? 'ab_magic_missile' : classType === 'rogue' ? 'ab_sneak_attack' : 'ab_cleric_heal',
          name: classType === 'fighter' ? 'Shield Bash' : classType === 'wizard' ? 'Magic Missile' : classType === 'rogue' ? 'Shadow Snipe' : 'Prayer of Healing',
          actionCost: 'action',
          cooldownTurns: 2,
          currentCooldown: 0,
          range: classType === 'fighter' ? 1 : 5,
          damageDice: classType === 'fighter' ? '1d6+3' : classType === 'wizard' ? '3d4+3' : '2d6+3',
          healAmount: classType === 'cleric' ? '2d8+3' : undefined,
          description: 'Special class prowess.',
          icon: '⚡'
        }
      ],
      inventory: [
        { id: `inv_pot_${Date.now()}`, name: 'Potion of Healing', type: 'consumable', rarity: 'common', description: 'Restores 2d4+2 HP.', effect: 'heal_2d4_2', quantity: 1 }
      ]
    };

    this.state.heroes.push(newHero);
    this.state.initiativeList.push({
      id: newHero.id,
      name: newHero.name,
      type: 'hero',
      initiative: newHero.initiative,
      portrait: newHero.portrait,
      isCurrentTurn: false,
      isDone: false,
      isAlive: true
    });
    this.state.initiativeList.sort((a, b) => b.initiative - a.initiative);

    this.addLog({
      source: 'Character Roster',
      action: 'Custom Character Imported!',
      detail: `✨ ${newHero.name} (Lvl ${data.level} ${data.characterClass}) joined the expedition! Validated via Ajv Schema. Token placed on the grid.`,
      type: 'system'
    });
    this.state.turnNotice = `✨ Imported Character: ${newHero.name} (${data.characterClass}, Lvl ${data.level}) token added!`;

    this.updateTurnPrompt();
    this.notify();
    return newHero;
  }

  private addLog(entry: Omit<CombatLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
    const fullEntry: CombatLogEntry = {
      id: entry.id || `log_${Date.now()}_${Math.random()}`,
      timestamp: entry.timestamp || new Date().toLocaleTimeString(),
      ...entry
    };
    this.state.combatLog.unshift(fullEntry);
    if (this.state.combatLog.length > 80) {
      this.state.combatLog.pop();
    }
  }
}
