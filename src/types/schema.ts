/**
 * Core TypeScript definitions for the DM-Free D&D Applet Game Engine.
 * Formats match the comprehensive JSON Schema specification.
 */

export interface GridCoordinate {
  x: number;
  y: number;
}

export type Direction = 'north' | 'south' | 'east' | 'west';

export type TileKind = 
  | 'floor' 
  | 'wall' 
  | 'doorway' 
  | 'edge' 
  | 'hazard' 
  | 'trap' 
  | 'void'
  | 'pillar'
  | 'cell'
  | 'gilded_floor';

export interface GridTile {
  x: number;
  y: number;
  kind: TileKind;
  walkable: boolean;
  roomId: string;
  isRevealed: boolean;
  hazardId?: string;
  trapId?: string;
  elevation?: number;
  coverLevel?: 'none' | 'half' | 'three_quarters' | 'full';
}

export interface CharacterTurnState {
  moveRemaining: number;
  maxMove: number;
  hasMoved: boolean;
  actionsRemaining: number; // Standard Attack / Cast / Dash (max 1 per turn)
  hasActed: boolean;
  interactsRemaining: number; // Item / Chest / Trap / Door (max 1 per turn)
  hasInteracted: boolean;
  bonusActionsRemaining: number;
  hasDashed: boolean;
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  durationTurns: number;
  description: string;
  damagePerTurn?: string;
  statModifiers?: {
    speed?: number;
    ac?: number;
    attackRollBonus?: number;
  };
}

export interface HeroCharacter {
  id: string;
  name: string;
  classType: 'fighter' | 'wizard' | 'rogue' | 'cleric';
  hp: number;
  maxHp: number;
  ac: number;
  speed: number; // Grid squares per turn (usually 6 = 30ft)
  initiative: number;
  position: GridCoordinate;
  turnState: CharacterTurnState;
  portrait: string;
  weapons: WeaponAttack[];
  abilities: ClassAbility[];
  inventory: InventoryItem[];
  color: string;
}

export interface WeaponAttack {
  id: string;
  name: string;
  range: number; // 1 = melee (adjacent 5ft), >1 = ranged
  attackBonus: number;
  damageDice: string; // e.g. "1d8+3"
  damageType: 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'radiant' | 'necrotic' | 'force' | 'acid' | 'poison';
  description: string;
}

export interface ClassAbility {
  id: string;
  name: string;
  actionCost: 'action' | 'bonus' | 'interact';
  cooldownTurns: number;
  currentCooldown: number;
  range: number;
  aoeRadius?: number;
  damageDice?: string;
  healAmount?: string;
  description: string;
  icon: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'consumable' | 'weapon' | 'armor' | 'legendary_artifact' | 'quest' | 'relic';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  effect?: string;
  quantity: number;
}

// ================= MONSTER AI DEFINITION ================= //

export type MonsterBehaviorType = 'chase' | 'ambush' | 'patrol' | 'boss_phased' | 'support';
export type TargetingRule = 'lowest_hp' | 'nearest' | 'highest_threat' | 'isolated' | 'random';

export interface AIActionStep {
  triggerCondition: 'always' | 'in_attack_range' | 'out_of_range' | 'hp_below_half' | 'turn_interval';
  actionType: 'move' | 'attack' | 'retreat' | 'special_ability' | 'patrol_step';
  moveDistance?: number;
  attackRange?: number;
  damageDice?: string;
  hitBonus?: number;
  savingThrowDC?: number;
  specialAbilityName?: string;
  effectDescription?: string;
}

export interface MonsterAIConfig {
  behaviorType: MonsterBehaviorType;
  targetingRule: TargetingRule;
  preferredRange: number; // 1 = melee, 3-5 = ranged skirmisher
  patrolWaypoints?: GridCoordinate[];
  currentPatrolIndex?: number;
  ambushConfig?: {
    isStealthed: boolean;
    revealRange: number; // triggers attack when hero gets this close
    surpriseBonusDamage?: string;
    retreatAfterAttackSquares?: number;
  };
  actions: AIActionStep[];
}

export interface MonsterInstance {
  id: string;
  templateId: string;
  name: string;
  monsterType: 'skeleton' | 'goblin' | 'giant_spider' | 'hobgoblin' | 'wraith' | 'venom_troll' | 'boss' | 'hound' | 'dragon' | 'hound_boss';
  tier: 1 | 2 | 3;
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  position: GridCoordinate;
  isAlive: boolean;
  ai: MonsterAIConfig;
  attacks: WeaponAttack[];
  specialAbilities: string[];
  statusEffects: StatusEffect[];
  threatLevel: number;
  experienceReward: number;
  isBoss?: boolean;
}

// ================= EXPLORATION TRIGGER & SPAWNING RULE ================= //

export type ExplorationTriggerType = 'edge_coordinate' | 'door_interact' | 'proximity' | 'boss_cleared';

export interface ExplorationTrigger {
  id: string;
  type: ExplorationTriggerType;
  coordinate: GridCoordinate;
  connectsToDirection: Direction;
  targetRoomIndex?: number;
  isTriggered: boolean;
  spawnRule: 'spawns_on_occupy' | 'spawns_on_interact';
  leadText: string;
}

// ================= HAZARDS & TRAPS ================= //

export type HazardType = 'crumbling_floor' | 'toxic_miasma' | 'acid_pool' | 'magma_vent';

export interface HazardInstance {
  id: string;
  type: HazardType;
  name: string;
  coordinate: GridCoordinate;
  roomId: string;
  currentIntegrity: number; // e.g. for crumbling floor: 2 steps remaining
  maxIntegrity: number;
  state: 'stable' | 'cracking' | 'collapsed' | 'active';
  damageOnTrigger: string;
  damageType: 'bludgeoning' | 'poison' | 'acid' | 'fire';
  savingThrowDC: number;
  saveAttribute: 'dex' | 'con';
  description: string;
}

export type TrapType = 'spike_pit' | 'poison_dart' | 'pressure_boulder' | 'arcane_rune';

export interface TrapInstance {
  id: string;
  type: TrapType;
  name: string;
  coordinate: GridCoordinate;
  roomId: string;
  isDetected: boolean;
  isDisarmed: boolean;
  isTriggered: boolean;
  perceptionDC: number;
  disarmDC: number;
  damageDice: string;
  damageType: 'piercing' | 'poison' | 'bludgeoning' | 'force';
  savingThrowDC: number;
  saveAttribute: 'dex' | 'con' | 'wis';
  description: string;
}

// ================= BOSS ENCOUNTER MECHANICS ================= //

export interface BossPhaseMechanic {
  phaseNumber: number;
  hpThresholdPercentage: number; // e.g. 100, 60, 30
  mechanicName: string;
  description: string;
  shieldActive?: boolean;
  summonMinions?: { monsterType: string; count: number }[];
  environmentalEffect?: string;
  damageBonus?: string;
}

export interface BossEncounterData {
  bossMonsterId: string;
  bossName: string;
  title: string;
  currentPhase: number;
  totalPhases: number;
  pillarsToDeactivate?: { coordinate: GridCoordinate; isDeactivated: boolean }[];
  phaseMechanics: BossPhaseMechanic[];
  defeatCondition: 'kill_boss' | 'deactivate_pillars_then_kill';
}

// ================= ROOM DATA BLOCK ================= //

export interface ChestInstance {
  id: string;
  coordinate: GridCoordinate;
  isOpened: boolean;
  isLocked: boolean;
  unlockDC?: number;
  loot: InventoryItem[];
  goldReward?: number;
}

export interface PrisonCellInstance {
  id: string;
  cellNumber: number;
  coordinate: GridCoordinate;
  roomId: string;
  prisonerName: string;
  isUnlocked: boolean;
  rewardGold: number;
  flavorQuote: string;
}

export interface TreasureHoardInstance {
  id: string;
  coordinate: GridCoordinate;
  goldValue: number;
  isLooted: boolean;
  legendaryItem?: InventoryItem;
}

export interface TreasureChamberScenario {
  chamberRoomId: string;
  isTriggered: boolean;
  isSealed: boolean;
  roundsUntilSeal: number; // 2-round countdown
  maxRoundsUntilSeal: number;
  dragonSummoned: boolean;
  dragonDefeated: boolean;
  hoardLooted: boolean;
  totalGoldInVault: number;
}

export interface HoundEventState {
  totalPrisoners: number; // 10
  rescuedPrisoners: number;
  houndsReleased: boolean; // triggered at 3
  houndsInChaseMode: boolean; // triggered at 7
  spawnedHoundsCount: number;
  houndBossSpawned: boolean; // triggered when all hounds defeated or all 10 prisoners saved
  houndBossDefeated: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  category: 'weapon' | 'armor' | 'consumable' | 'relic';
  description: string;
  targetClass?: 'fighter' | 'rogue' | 'wizard' | 'cleric' | 'all';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  voucherCostId?: string;
  weaponUpgrade?: WeaponAttack;
  statBonus?: {
    ac?: number;
    maxHp?: number;
    speed?: number;
  };
  consumableItem?: InventoryItem;
}

export interface WarningSteleInstance {
  coordinate: GridCoordinate;
  title: string;
  message: string;
  isRead?: boolean;
}

export interface RestPointInstance {
  id: string;
  coordinate: GridCoordinate;
  name: string;
  isUsed: boolean;
  hpRestore: number;
}

export interface RoomDataBlock {
  id: string;
  roomIndex: number;
  title: string;
  theme: string;
  origin: GridCoordinate; // Top-left corner on global grid
  width: number;
  height: number;
  tiles: GridTile[];
  edgeCoordinates: ExplorationTrigger[];
  monsters: MonsterInstance[];
  hazards: HazardInstance[];
  traps: TrapInstance[];
  chests: ChestInstance[];
  prisonCells?: PrisonCellInstance[];
  isTreasureChamber?: boolean;
  treasureHoard?: TreasureHoardInstance;
  warningStele?: WarningSteleInstance;
  restPoint?: RestPointInstance;
  interactableObjects?: Array<{ id: string; type: 'stele' | 'rest_point' | string; name: string; coordinate: GridCoordinate; isUsed: boolean; description?: string; }>;
  isExplored: boolean;
  flavorText: string;
  isBossRoom: boolean;
  bossEncounter?: BossEncounterData;
}

// ================= MODULE EXPANSION PACKAGE ================= //

export interface ModulePackage {
  id: string;
  moduleNumber: 1 | 2 | 3 | 4 | number;
  title: string;
  subtitle: string;
  tierDescription: string;
  recommendedLevel: string;
  description: string;
  isSoloOnly?: boolean;
  completionRewards?: {
    voucherId?: string;
    voucherName?: string;
    gold?: number;
    unlocksShopItem?: string;
  };
  rooms: RoomDataBlock[];
  lootTable: InventoryItem[];
  environmentalSummary: {
    hazardName: string;
    hazardRule: string;
    trapName: string;
    trapRule: string;
    bossMechanicName: string;
    bossMechanicRule: string;
  };
}

// ================= GAME ENGINE RUNTIME STATE ================= //

export type TurnPhase = 
  | 'HERO_TURN' 
  | 'EXPLORATION_CHECK' 
  | 'MONSTER_TURN' 
  | 'HAZARD_STEP' 
  | 'ROUND_END' 
  | 'VICTORY' 
  | 'DEFEAT';

export interface CombatLogEntry {
  id: string;
  timestamp: string;
  source: string;
  action: string;
  detail: string;
  roll?: {
    d20: number;
    modifier: number;
    total: number;
    targetDC?: number;
    targetAC?: number;
    isCrit?: boolean;
    isCritFail?: boolean;
    isHit?: boolean;
  };
  damage?: {
    amount: number;
    type: string;
  };
  type: 'move' | 'attack' | 'damage' | 'heal' | 'hazard' | 'trap' | 'reveal' | 'system' | 'boss';
}

export interface InitiativeMember {
  id: string;
  name: string;
  type: 'hero' | 'monsters';
  portrait: string;
  initiative: number;
  isCurrentTurn: boolean;
  isDone: boolean;
  isAlive: boolean;
}

export interface NearbyInteractable {
  type: 'chest' | 'trap' | 'pillar' | 'potion' | 'door' | 'cell' | 'treasure_hoard' | 'stele' | 'rest_point';
  label: string;
  id?: string;
  cellNumber?: number;
  goldValue?: number;
}

export interface MonsterInRangeInfo {
  id: string;
  name: string;
  distance: number;
  hp: number;
  maxHp: number;
  weaponIndex: number;
  weaponName: string;
  weaponRange: number;
}

export interface TurnPrompt {
  heroId: string;
  heroName: string;
  phaseStep: 'move' | 'combat' | 'interact' | 'done';
  message: string;
  canAttack: boolean;
  monstersInRange: MonsterInRangeInfo[];
  canInteract: boolean;
  nearbyInteractables: NearbyInteractable[];
}

export interface GameEngineState {
  currentModule: ModulePackage;
  currentModuleId: string;
  turnPhase: TurnPhase;
  currentRound: number;
  activeHeroIndex: number;
  heroes: HeroCharacter[];
  activeRooms: RoomDataBlock[];
  allTiles: Map<string, GridTile>; // Key: "x,y"
  combatLog: CombatLogEntry[];
  selectedHeroId: string | null;
  selectedAction: 'move' | 'attack' | 'ability' | 'interact' | null;
  selectedAbilityId?: string;
  initiativeList: InitiativeMember[];
  currentInitiativeIndex: number;
  turnPrompt: TurnPrompt | null;
  turnNotice?: string;
  partyGold: number;
  canAccessShop: boolean;
  houndEventState: HoundEventState;
  treasureChamberScenario?: TreasureChamberScenario;
  gameStats: {
    roomsExplored: number;
    monstersSlain: number;
    damageDealt: number;
    trapsDisarmed: number;
    chestsOpened: number;
    goldEarned: number;
    prisonersRescued: number;
  };
  isSoloExpedition?: boolean;
  expeditionStartingGold?: number;
  expeditionLootCollected?: InventoryItem[];
  issuedVouchers?: any[];
  isGameOver: boolean;
  isVictory: boolean;
  bossDefeated?: boolean;
}

export interface SavedSessionHeroSummary {
  id: string;
  name: string;
  portrait: string;
  classType: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
}

export interface SavedSessionMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  moduleId: string;
  moduleTitle: string;
  currentRound: number;
  roomsExplored: number;
  maxRooms: number;
  monstersSlain: number;
  bossDefeated: boolean;
  partyGold: number;
  heroes: SavedSessionHeroSummary[];
}

export interface ExportedSessionFile {
  version: number;
  appName: string;
  exportDate: string;
  metadata: SavedSessionMetadata;
  state: any; // Serialized GameEngineState where allTiles is [string, GridTile][]
}
