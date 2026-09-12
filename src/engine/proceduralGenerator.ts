import { RoomDataBlock, GridTile, MonsterInstance, HazardInstance, TrapInstance, ChestInstance, ExplorationTrigger } from '../types/schema';

// Bestiary for procedural generation
const PROCEDURAL_MONSTERS = [
  {
    name: 'Skeletal Sentinel',
    type: 'skeleton' as const,
    hp: 14,
    ac: 13,
    speed: 6,
    threat: 1,
    aiType: 'patrol' as const,
    target: 'lowest_hp' as const,
    damage: '1d6+2'
  },
  {
    name: 'Goblin Sneak',
    type: 'goblin' as const,
    hp: 10,
    ac: 14,
    speed: 6,
    threat: 1,
    aiType: 'ambush' as const,
    target: 'nearest' as const,
    damage: '1d6+2'
  },
  {
    name: 'Crypt Weaver Spider',
    type: 'giant_spider' as const,
    hp: 20,
    ac: 14,
    speed: 6,
    threat: 2,
    aiType: 'ambush' as const,
    target: 'isolated' as const,
    damage: '1d8+3'
  }
];

const ROOM_THEMES = [
  { title: 'The Mossy Crypt', theme: 'Damp Stone Vaults', flavor: 'Luminescent lichen coats cracked tombstones. Water drips steadily into dark puddles.' },
  { title: 'The Torture Pit', theme: 'Rusted Iron & Ash', flavor: 'Chains hang from vaulted ceilings. The metallic scent of blood lingers in the air.' },
  { title: 'The Catacombs of Silence', theme: 'Ancient Ossuary', flavor: 'Mummified remains stare from niches cut directly into the granite strata.' },
  { title: 'The Subterranean Shrine', theme: 'Forgotten Temple', flavor: 'A defaced idol to a forgotten deity stands cracked upon a raised dais.' },
  { title: 'The Web-Choked Gallery', theme: 'Spider Den', flavor: 'Silken cocoons of various shapes swing gently in the phantom breeze.' }
];

let proceduralCounter = 100;

export function generateProceduralRoom(
  incomingEdgeCoord: { x: number; y: number },
  direction: 'north' | 'south' | 'east' | 'west',
  roomIndex: number
): RoomDataBlock {
  proceduralCounter++;
  const themeIndex = (roomIndex + proceduralCounter) % ROOM_THEMES.length;
  const theme = ROOM_THEMES[themeIndex];
  
  const width = Math.floor(Math.random() * 3) + 6; // 6 to 8
  const height = Math.floor(Math.random() * 3) + 6; // 6 to 8

  // Calculate new room origin so incoming edge coordinate matches an entrance door
  let originX = incomingEdgeCoord.x;
  let originY = incomingEdgeCoord.y;
  let entranceX = incomingEdgeCoord.x;
  let entranceY = incomingEdgeCoord.y;

  if (direction === 'east') {
    originX = incomingEdgeCoord.x + 1;
    originY = incomingEdgeCoord.y - Math.floor(height / 2);
    entranceX = originX;
    entranceY = incomingEdgeCoord.y;
  } else if (direction === 'west') {
    originX = incomingEdgeCoord.x - width;
    originY = incomingEdgeCoord.y - Math.floor(height / 2);
    entranceX = originX + width - 1;
    entranceY = incomingEdgeCoord.y;
  } else if (direction === 'south') {
    originX = incomingEdgeCoord.x - Math.floor(width / 2);
    originY = incomingEdgeCoord.y + 1;
    entranceX = incomingEdgeCoord.x;
    entranceY = originY;
  } else { // north
    originX = incomingEdgeCoord.x - Math.floor(width / 2);
    originY = incomingEdgeCoord.y - height;
    entranceX = incomingEdgeCoord.x;
    entranceY = originY + height - 1;
  }

  const roomId = `proc_room_${roomIndex}_${proceduralCounter}`;
  const tiles: GridTile[] = [];

  // Edge doors: Entrance + 1 new exit edge
  const exitEdges: { x: number; y: number; dir: 'north' | 'south' | 'east' | 'west' }[] = [];
  
  // Decide exit direction
  let exitDir: 'north' | 'south' | 'east' | 'west' = 'east';
  if (direction === 'east') exitDir = Math.random() > 0.5 ? 'east' : 'south';
  else if (direction === 'south') exitDir = Math.random() > 0.5 ? 'south' : 'east';
  else if (direction === 'west') exitDir = 'south';
  else exitDir = 'east';

  let exitX = originX + width - 1;
  let exitY = originY + Math.floor(height / 2);
  if (exitDir === 'south') {
    exitX = originX + Math.floor(width / 2);
    exitY = originY + height - 1;
  }

  const doorCoordinates = [
    { x: entranceX, y: entranceY },
    { x: exitX, y: exitY }
  ];

  const doorKeySet = new Set(doorCoordinates.map(d => `${d.x},${d.y}`));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = originX + x;
      const gy = originY + y;
      const isWall = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      const isDoor = doorKeySet.has(`${gx},${gy}`);

      tiles.push({
        x: gx,
        y: gy,
        kind: isDoor ? 'edge' : (isWall ? 'wall' : 'floor'),
        walkable: isDoor || !isWall,
        roomId,
        isRevealed: true
      });
    }
  }

  // Create monsters
  const monsters: MonsterInstance[] = [];
  const numMonsters = Math.min(3, Math.floor(Math.random() * 2) + 1);

  for (let i = 0; i < numMonsters; i++) {
    const template = PROCEDURAL_MONSTERS[i % PROCEDURAL_MONSTERS.length];
    const mx = originX + 2 + (i % 3);
    const my = originY + 2 + Math.floor(i / 3);

    monsters.push({
      id: `proc_mon_${roomIndex}_${i}`,
      templateId: `proc_template_${template.type}`,
      name: `${template.name} #${i + 1}`,
      monsterType: template.type,
      tier: 1,
      hp: template.hp,
      maxHp: template.hp,
      ac: template.ac,
      speed: template.speed,
      position: { x: mx, y: my },
      isAlive: true,
      ai: {
        behaviorType: template.aiType,
        targetingRule: template.target,
        preferredRange: template.aiType === 'ambush' ? 3 : 1,
        patrolWaypoints: template.aiType === 'patrol' ? [{ x: mx, y: my }, { x: mx + 1, y: my + 1 }] : undefined,
        ambushConfig: template.aiType === 'ambush' ? {
          isStealthed: true,
          revealRange: 3,
          retreatAfterAttackSquares: 2
        } : undefined,
        actions: [
          {
            triggerCondition: 'in_attack_range',
            actionType: 'attack',
            attackRange: template.aiType === 'ambush' ? 4 : 1,
            damageDice: template.damage,
            hitBonus: 4
          },
          {
            triggerCondition: 'out_of_range',
            actionType: 'move',
            moveDistance: 4
          }
        ]
      },
      attacks: [
        {
          id: `atk_${template.type}`,
          name: `${template.type.toUpperCase()} Strike`,
          range: template.aiType === 'ambush' ? 4 : 1,
          attackBonus: 4,
          damageDice: template.damage,
          damageType: 'piercing',
          description: 'Algorithmic strike against target.'
        }
      ],
      specialAbilities: [template.aiType === 'ambush' ? 'Stealth Strike' : 'Patrol Stance'],
      statusEffects: [],
      threatLevel: template.threat,
      experienceReward: 75
    });
  }

  // Hazards: Crumbling floor
  const hazards: HazardInstance[] = [];
  if (Math.random() > 0.4) {
    hazards.push({
      id: `proc_hazard_${roomIndex}`,
      type: 'crumbling_floor',
      name: 'Unstable Flagstone',
      coordinate: { x: originX + Math.floor(width / 2), y: originY + Math.floor(height / 2) },
      roomId,
      currentIntegrity: 2,
      maxIntegrity: 2,
      state: 'stable',
      damageOnTrigger: '1d6',
      damageType: 'bludgeoning',
      savingThrowDC: 12,
      saveAttribute: 'dex',
      description: 'Crumbling floor collapses after 2 steps into a pit trap.'
    });
  }

  // Traps
  const traps: TrapInstance[] = [];
  if (Math.random() > 0.5) {
    traps.push({
      id: `proc_trap_${roomIndex}`,
      type: 'spike_pit',
      name: 'Spring-Loaded Spike Plate',
      coordinate: { x: originX + 2, y: originY + 3 },
      roomId,
      isDetected: false,
      isDisarmed: false,
      isTriggered: false,
      perceptionDC: 12,
      disarmDC: 13,
      damageDice: '2d6',
      damageType: 'piercing',
      savingThrowDC: 13,
      saveAttribute: 'dex',
      description: 'Hidden spike trap. Step on coordinate triggers 2d6 piercing.'
    });
  }

  // Chest
  const chests: ChestInstance[] = [];
  if (Math.random() > 0.3) {
    chests.push({
      id: `proc_chest_${roomIndex}`,
      coordinate: { x: originX + width - 2, y: originY + 1 },
      isOpened: false,
      isLocked: false,
      loot: [
        {
          id: `pot_${roomIndex}`,
          name: 'Potion of Greater Healing',
          type: 'consumable',
          rarity: 'rare',
          description: 'Restores 4d4+4 HP.',
          effect: 'heal_4d4_4',
          quantity: 1
        }
      ]
    });
  }

  // Next edge coordinates
  const edgeCoordinates: ExplorationTrigger[] = [
    {
      id: `proc_edge_${roomIndex}`,
      type: 'edge_coordinate',
      coordinate: { x: exitX, y: exitY },
      connectsToDirection: exitDir,
      targetRoomIndex: roomIndex + 1,
      isTriggered: false,
      spawnRule: 'spawns_on_occupy',
      leadText: `A corridor continues towards the ${exitDir}...`
    }
  ];

  return {
    id: roomId,
    roomIndex,
    title: `${theme.title} (Level ${roomIndex})`,
    theme: theme.theme,
    origin: { x: originX, y: originY },
    width,
    height,
    tiles,
    edgeCoordinates,
    monsters,
    hazards,
    traps,
    chests,
    isExplored: true,
    flavorText: theme.flavor,
    isBossRoom: false
  };
}
