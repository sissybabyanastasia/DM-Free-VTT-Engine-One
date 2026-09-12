/**
 * Data Packages for Module 1 (Core Set), Module 2 (Advanced Set), and Module 3 (Epic Expansion).
 * Follows the DM-Free D&D Applet Game Engine Schema strictly.
 */

import { ModulePackage, RoomDataBlock, InventoryItem, MonsterInstance, GridTile } from '../types/schema';

// Helper to generate a room's grid tiles
function generateRoomTiles(
  roomId: string, 
  originX: number, 
  originY: number, 
  width: number, 
  height: number, 
  doorEdges: { x: number; y: number }[] = [],
  specialFloorKind?: 'gilded_floor'
): GridTile[] {
  const tiles: GridTile[] = [];
  const doorKeySet = new Set(doorEdges.map(d => `${d.x},${d.y}`));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = originX + x;
      const gy = originY + y;
      const isEdge = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      const isDoor = doorKeySet.has(`${gx},${gy}`);

      tiles.push({
        x: gx,
        y: gy,
        kind: isDoor ? 'edge' : (isEdge ? 'wall' : (specialFloorKind || 'floor')),
        walkable: isDoor || !isEdge,
        roomId,
        isRevealed: false
      });
    }
  }
  return tiles;
}

// -------------------------------------------------------------
// MODULE 1: CORE SET W/ STANDARD FOES
// -------------------------------------------------------------

// Introductory 5-Room Layout
// Room 1: Antechamber (Starting point, edge to Room 2)
// Room 2: The Ossuary (Skeleton Patrol - chase behavior)
// Room 3: Webbed Descent (Giant Spider Ambush + Crumbling Floor Hazard)
// Room 4: Goblin Sentry Outpost (Goblin Hit & Run + Spike Trap)
// Room 5: Crypt Lord's Sanctum (Boss Malakor + Bone Pillars Mechanic)

const MODULE_1_ROOMS: RoomDataBlock[] = [
  {
    id: 'm1_room_1',
    roomIndex: 1,
    title: 'The Sunken Antechamber',
    theme: 'Ancient Stone Crypt',
    origin: { x: 0, y: 0 },
    width: 6,
    height: 6,
    tiles: generateRoomTiles('m1_room_1', 0, 0, 6, 6, [{ x: 5, y: 3 }]),
    edgeCoordinates: [
      {
        id: 'edge_r1_to_r2',
        type: 'edge_coordinate',
        coordinate: { x: 5, y: 3 },
        connectsToDirection: 'east',
        targetRoomIndex: 2,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'Heavy iron-reinforced archway leads deeper into darkness...'
      }
    ],
    monsters: [],
    hazards: [],
    traps: [],
    chests: [
      {
        id: 'chest_r1',
        coordinate: { x: 2, y: 1 },
        isOpened: false,
        isLocked: false,
        goldReward: 60,
        loot: [
          {
            id: 'pot_heal_1',
            name: 'Potion of Healing',
            type: 'consumable',
            rarity: 'common',
            description: 'Restores 2d4+2 Hit Points when consumed as an interact action.',
            effect: 'heal_2d4_2',
            quantity: 2
          }
        ]
      }
    ],
    prisonCells: [
      {
        id: 'cell_m1_1',
        cellNumber: 1,
        coordinate: { x: 4, y: 1 },
        roomId: 'm1_room_1',
        prisonerName: 'Bram the Apprentice Smith',
        isUnlocked: false,
        rewardGold: 40,
        flavorQuote: 'By Moradin, you shattered the lock! The dungeon hounds howl deep below—take these coins and watch your flank!'
      }
    ],
    isExplored: true, // Starting room
    flavorText: 'Cobwebs drape the damp stone archways. The cold draft from the eastern passage promises danger.',
    isBossRoom: false
  },
  {
    id: 'm1_room_2',
    roomIndex: 2,
    title: 'The Ossuary of Bones',
    theme: 'Bone-Carved Alcoves',
    origin: { x: 6, y: 0 },
    width: 7,
    height: 6,
    tiles: generateRoomTiles('m1_room_2', 6, 0, 7, 6, [{ x: 6, y: 3 }, { x: 9, y: 5 }, { x: 12, y: 2 }]),
    edgeCoordinates: [
      {
        id: 'edge_r2_to_r3',
        type: 'edge_coordinate',
        coordinate: { x: 9, y: 5 },
        connectsToDirection: 'south',
        targetRoomIndex: 3,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'A cracked stone doorway descends south where thick sticky threads shimmer.'
      },
      {
        id: 'edge_r2_to_r6',
        type: 'edge_coordinate',
        coordinate: { x: 12, y: 2 },
        connectsToDirection: 'east',
        targetRoomIndex: 6,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'Heavy gilded vault door carved with draconic runes. Molten gold glows through the seams.'
      }
    ],
    monsters: [
      {
        id: 'mon_skel_1',
        templateId: 'skeleton_standard',
        name: 'Restless Skeleton',
        monsterType: 'skeleton',
        tier: 1,
        hp: 13,
        maxHp: 13,
        ac: 13,
        speed: 6,
        position: { x: 10, y: 2 },
        isAlive: true,
        ai: {
          behaviorType: 'patrol',
          targetingRule: 'lowest_hp',
          preferredRange: 1,
          patrolWaypoints: [{ x: 10, y: 2 }, { x: 8, y: 4 }, { x: 11, y: 4 }],
          currentPatrolIndex: 0,
          actions: [
            {
              triggerCondition: 'out_of_range',
              actionType: 'move',
              moveDistance: 4,
              effectDescription: 'Marches relentlessly toward the hero with the lowest HP'
            },
            {
              triggerCondition: 'in_attack_range',
              actionType: 'attack',
              attackRange: 1,
              damageDice: '1d6+2',
              hitBonus: 4,
              effectDescription: 'Slashes with rusty shortsword (1d6+2 piercing)'
            }
          ]
        },
        attacks: [
          {
            id: 'skel_sword',
            name: 'Ancient Shortsword',
            range: 1,
            attackBonus: 4,
            damageDice: '1d6+2',
            damageType: 'piercing',
            description: 'Thrust with notched iron blade.'
          }
        ],
        specialAbilities: ['Relentless March'],
        statusEffects: [],
        threatLevel: 1,
        experienceReward: 50
      },
      {
        id: 'mon_skel_2',
        templateId: 'skeleton_archer',
        name: 'Skeleton Archer',
        monsterType: 'skeleton',
        tier: 1,
        hp: 11,
        maxHp: 11,
        ac: 12,
        speed: 5,
        position: { x: 11, y: 3 },
        isAlive: true,
        ai: {
          behaviorType: 'chase',
          targetingRule: 'lowest_hp',
          preferredRange: 4,
          actions: [
            {
              triggerCondition: 'in_attack_range',
              actionType: 'attack',
              attackRange: 5,
              damageDice: '1d6+2',
              hitBonus: 4,
              effectDescription: 'Fires bone-tipped arrow at most vulnerable target'
            }
          ]
        },
        attacks: [
          {
            id: 'skel_bow',
            name: 'Shortbow',
            range: 5,
            attackBonus: 4,
            damageDice: '1d6+2',
            damageType: 'piercing',
            description: 'Whistling bone arrow.'
          }
        ],
        specialAbilities: ['Volley'],
        statusEffects: [],
        threatLevel: 1,
        experienceReward: 50
      }
    ],
    hazards: [],
    traps: [],
    chests: [],
    prisonCells: [
      {
        id: 'cell_m1_2',
        cellNumber: 2,
        coordinate: { x: 7, y: 1 },
        roomId: 'm1_room_2',
        prisonerName: 'Elira the Herbalist',
        isUnlocked: false,
        rewardGold: 40,
        flavorQuote: 'I thought I was doomed to be bone dust! Bless you! The kennel chains are stirring, be vigilant!'
      },
      {
        id: 'cell_m1_3',
        cellNumber: 3,
        coordinate: { x: 11, y: 4 },
        roomId: 'm1_room_2',
        prisonerName: 'Orin the Caravan Guard',
        isUnlocked: false,
        rewardGold: 40,
        flavorQuote: 'Free at last! Three prisoners rescued—listen! The dungeon bloodhounds have been loosed on patrol!'
      }
    ],
    isExplored: false,
    flavorText: 'Skulls line the walls in morbid patterns. As your torchlight enters, clattering bones assemble in unison!',
    isBossRoom: false
  },
  {
    id: 'm1_room_3',
    roomIndex: 3,
    title: 'The Webbed Descent',
    theme: 'Arachnid Chasm',
    origin: { x: 6, y: 6 },
    width: 7,
    height: 7,
    tiles: generateRoomTiles('m1_room_3', 6, 6, 7, 7, [{ x: 9, y: 6 }, { x: 12, y: 9 }]),
    edgeCoordinates: [
      {
        id: 'edge_r3_to_r4',
        type: 'edge_coordinate',
        coordinate: { x: 12, y: 9 },
        connectsToDirection: 'east',
        targetRoomIndex: 4,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'A crude goblin barricade with flickering torch smoke lies east.'
      }
    ],
    monsters: [
      {
        id: 'mon_spider_1',
        templateId: 'giant_spider_ambush',
        name: 'Shadowfang Spider',
        monsterType: 'giant_spider',
        tier: 1,
        hp: 22,
        maxHp: 22,
        ac: 14,
        speed: 6,
        position: { x: 9, y: 9 },
        isAlive: true,
        ai: {
          behaviorType: 'ambush',
          targetingRule: 'isolated',
          preferredRange: 1,
          ambushConfig: {
            isStealthed: true,
            revealRange: 2,
            surpriseBonusDamage: '1d8',
            retreatAfterAttackSquares: 0
          },
          actions: [
            {
              triggerCondition: 'in_attack_range',
              actionType: 'attack',
              attackRange: 1,
              damageDice: '1d8+3',
              hitBonus: 5,
              effectDescription: 'Venomous Mandible Bite (1d8+3 piercing + DC 11 CON save vs poison)'
            },
            {
              triggerCondition: 'out_of_range',
              actionType: 'special_ability',
              attackRange: 4,
              specialAbilityName: 'Web Shot',
              effectDescription: 'Spits sticky webbing: target must pass DC 12 DEX save or speed becomes 0 for 1 turn.'
            }
          ]
        },
        attacks: [
          {
            id: 'spider_bite',
            name: 'Venomous Bite',
            range: 1,
            attackBonus: 5,
            damageDice: '1d8+3',
            damageType: 'piercing',
            description: 'Fangs sink deep, injecting burning spider venom.'
          }
        ],
        specialAbilities: ['Ceiling Drop Ambush', 'Web Snare'],
        statusEffects: [],
        threatLevel: 2,
        experienceReward: 100
      }
    ],
    hazards: [
      {
        id: 'hazard_crumble_1',
        type: 'crumbling_floor',
        name: 'Fissured Stone Floor',
        coordinate: { x: 9, y: 8 },
        roomId: 'm1_room_3',
        currentIntegrity: 2, // 2 steps remaining before collapse
        maxIntegrity: 2,
        state: 'stable',
        damageOnTrigger: '1d6',
        damageType: 'bludgeoning',
        savingThrowDC: 12,
        saveAttribute: 'dex',
        description: 'Fragile stone slabs suspended over a spike-lined cavity. Supports only 2 steps before shattering completely.'
      },
      {
        id: 'hazard_crumble_2',
        type: 'crumbling_floor',
        name: 'Fissured Stone Floor',
        coordinate: { x: 10, y: 8 },
        roomId: 'm1_room_3',
        currentIntegrity: 2,
        maxIntegrity: 2,
        state: 'stable',
        damageOnTrigger: '1d6',
        damageType: 'bludgeoning',
        savingThrowDC: 12,
        saveAttribute: 'dex',
        description: 'Fragile stone slabs over a chasm.'
      }
    ],
    traps: [],
    chests: [
      {
        id: 'chest_r3',
        coordinate: { x: 11, y: 11 },
        isOpened: false,
        isLocked: true,
        unlockDC: 12,
        goldReward: 80,
        loot: [
          {
            id: 'item_spider_silk_cloak',
            name: 'Silken Web Cloak',
            type: 'armor',
            rarity: 'rare',
            description: 'Woven from giant spider silk. Grants +1 AC and immunity to web immobilization.',
            effect: 'ac_plus_1_web_immune',
            quantity: 1
          }
        ]
      }
    ],
    prisonCells: [
      {
        id: 'cell_m1_4',
        cellNumber: 4,
        coordinate: { x: 7, y: 11 },
        roomId: 'm1_room_3',
        prisonerName: 'Master Danor the Cartographer',
        isUnlocked: false,
        rewardGold: 40,
        flavorQuote: 'The spiders nearly cocooned me! Take my cartographer mapping purse!'
      },
      {
        id: 'cell_m1_5',
        cellNumber: 5,
        coordinate: { x: 11, y: 7 },
        roomId: 'm1_room_3',
        prisonerName: 'Selene the Acolyte',
        isUnlocked: false,
        rewardGold: 40,
        flavorQuote: 'The light guided your steps into this webbed pit! Bless your brave souls!'
      }
    ],
    isExplored: false,
    flavorText: 'Thick webs hang like tapestries. Beneath your boots, the limestone floor echoes hollowly over empty abyss.',
    isBossRoom: false
  },
  {
    id: 'm1_room_4',
    roomIndex: 4,
    title: 'The Goblin Watchpost',
    theme: 'Crude Barricades',
    origin: { x: 13, y: 6 },
    width: 6,
    height: 7,
    tiles: generateRoomTiles('m1_room_4', 13, 6, 6, 7, [{ x: 13, y: 9 }, { x: 18, y: 9 }]),
    edgeCoordinates: [
      {
        id: 'edge_r4_to_r5',
        type: 'edge_coordinate',
        coordinate: { x: 18, y: 9 },
        connectsToDirection: 'east',
        targetRoomIndex: 5,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'Runed double doors carved with screaming skulls. Pulsing necrotic light leaks from beneath.'
      }
    ],
    monsters: [
      {
        id: 'mon_gob_1',
        templateId: 'goblin_skirmisher',
        name: 'Sneaky Goblin Scrapper',
        monsterType: 'goblin',
        tier: 1,
        hp: 9,
        maxHp: 9,
        ac: 14,
        speed: 6,
        position: { x: 16, y: 8 },
        isAlive: true,
        ai: {
          behaviorType: 'ambush',
          targetingRule: 'nearest',
          preferredRange: 3,
          ambushConfig: {
            isStealthed: true,
            revealRange: 3,
            retreatAfterAttackSquares: 2
          },
          actions: [
            {
              triggerCondition: 'always',
              actionType: 'attack',
              attackRange: 4,
              damageDice: '1d6+2',
              hitBonus: 4,
              effectDescription: 'Nimble Escape: shoots shortbow then scampers 2 squares backwards'
            },
            {
              triggerCondition: 'in_attack_range',
              actionType: 'attack',
              attackRange: 1,
              damageDice: '1d6+2',
              hitBonus: 4,
              effectDescription: 'Scimitar jab if cornered'
            }
          ]
        },
        attacks: [
          {
            id: 'gob_bow',
            name: 'Crude Shortbow',
            range: 4,
            attackBonus: 4,
            damageDice: '1d6+2',
            damageType: 'piercing',
            description: 'Barbed rusty arrow.'
          }
        ],
        specialAbilities: ['Nimble Escape (Disengage Bonus)'],
        statusEffects: [],
        threatLevel: 1,
        experienceReward: 50
      },
      {
        id: 'mon_gob_2',
        templateId: 'goblin_cutter',
        name: 'Goblin Trapmaster',
        monsterType: 'goblin',
        tier: 1,
        hp: 11,
        maxHp: 11,
        ac: 13,
        speed: 6,
        position: { x: 16, y: 10 },
        isAlive: true,
        ai: {
          behaviorType: 'chase',
          targetingRule: 'lowest_hp',
          preferredRange: 1,
          actions: [
            {
              triggerCondition: 'always',
              actionType: 'move',
              moveDistance: 4
            },
            {
              triggerCondition: 'in_attack_range',
              actionType: 'attack',
              attackRange: 1,
              damageDice: '1d6+1',
              hitBonus: 3
            }
          ]
        },
        attacks: [
          {
            id: 'gob_scim',
            name: 'Jagged Scimitar',
            range: 1,
            attackBonus: 3,
            damageDice: '1d6+1',
            damageType: 'slashing',
            description: 'Cruel serrated blade.'
          }
        ],
        specialAbilities: ['Trap Lure'],
        statusEffects: [],
        threatLevel: 1,
        experienceReward: 50
      }
    ],
    hazards: [],
    traps: [
      {
        id: 'trap_spike_1',
        type: 'spike_pit',
        name: 'Concealed Floor Spike Tripwire',
        coordinate: { x: 15, y: 9 }, // Directly in central corridor
        roomId: 'm1_room_4',
        isDetected: false,
        isDisarmed: false,
        isTriggered: false,
        perceptionDC: 12,
        disarmDC: 13,
        damageDice: '2d6',
        damageType: 'piercing',
        savingThrowDC: 13,
        saveAttribute: 'dex',
        description: 'Tension wire linked to spring-loaded iron spikes. Stepping on coordinate triggers 2d6 piercing damage (DC 13 DEX save for half).'
      }
    ],
    chests: [],
    prisonCells: [
      {
        id: 'cell_m1_6',
        cellNumber: 6,
        coordinate: { x: 14, y: 11 },
        roomId: 'm1_room_4',
        prisonerName: 'Garrick the Scout',
        isUnlocked: false,
        rewardGold: 40,
        flavorQuote: 'The goblins kept us caged for sport! Take this coin stash I hid in my boot!'
      },
      {
        id: 'cell_m1_7',
        cellNumber: 7,
        coordinate: { x: 17, y: 7 },
        roomId: 'm1_room_4',
        prisonerName: 'Mira the Weaver',
        isUnlocked: false,
        rewardGold: 40,
        flavorQuote: 'Seven of us are free! But hear that baying?! The bloodhounds caught your scent—they have entered CHASE MODE!'
      },
      {
        id: 'cell_m1_8',
        cellNumber: 8,
        coordinate: { x: 17, y: 11 },
        roomId: 'm1_room_4',
        prisonerName: 'Tobias the Tavern Keeper',
        isUnlocked: false,
        rewardGold: 40,
        flavorQuote: 'Alive! When we get back to town, every round is on me!'
      }
    ],
    isExplored: false,
    flavorText: 'Crude wooden stakes and half-eaten rations litter the room. The goblins hiss and ready their bows!',
    isBossRoom: false
  },
  {
    id: 'm1_room_5',
    roomIndex: 5,
    title: "The Crypt Lord's Sanctum",
    theme: 'Unholy Necropolis',
    origin: { x: 19, y: 6 },
    width: 8,
    height: 8,
    tiles: generateRoomTiles('m1_room_5', 19, 6, 8, 8, [{ x: 19, y: 9 }]),
    edgeCoordinates: [], // Final room
    monsters: [
      {
        id: 'boss_malakor',
        templateId: 'crypt_lord_malakor',
        name: 'Malakor the Bone Lord',
        monsterType: 'boss',
        tier: 1,
        hp: 48,
        maxHp: 48,
        ac: 15,
        speed: 5,
        position: { x: 24, y: 10 },
        isAlive: true,
        isBoss: true,
        ai: {
          behaviorType: 'boss_phased',
          targetingRule: 'nearest',
          preferredRange: 3,
          actions: [
            {
              triggerCondition: 'always',
              actionType: 'special_ability',
              attackRange: 4,
              specialAbilityName: 'Necrotic Grasp',
              damageDice: '2d6+3',
              hitBonus: 5,
              effectDescription: 'Grasping skeletal hands erupt from the ground beneath the target'
            },
            {
              triggerCondition: 'in_attack_range',
              actionType: 'attack',
              attackRange: 1,
              damageDice: '1d10+3',
              hitBonus: 6,
              effectDescription: 'Heavy Grave Cleave with obsidian scythe'
            }
          ]
        },
        attacks: [
          {
            id: 'boss_scythe',
            name: 'Grave Reaver Scythe',
            range: 1,
            attackBonus: 6,
            damageDice: '1d10+3',
            damageType: 'slashing',
            description: 'Reaps the soul with necrotic frost.'
          },
          {
            id: 'boss_necrotic_bolt',
            name: 'Death Bolt',
            range: 4,
            attackBonus: 5,
            damageDice: '2d6+2',
            damageType: 'necrotic',
            description: 'Hurls concentrated shadow.'
          }
        ],
        specialAbilities: ['Bone Shielding', 'Soul Siphon', 'Animate Bones'],
        statusEffects: [
          {
            id: 'effect_bone_shield',
            name: 'Bone Aegis',
            type: 'buff',
            durationTurns: 99,
            description: 'Invulnerable while either Crypt Pillar remains active!'
          }
        ],
        threatLevel: 5,
        experienceReward: 500
      }
    ],
    hazards: [],
    traps: [],
    chests: [
      {
        id: 'chest_boss_vault',
        coordinate: { x: 25, y: 7 },
        isOpened: false,
        isLocked: false,
        loot: [
          {
            id: 'item_sun_shard',
            name: 'Radiant Sunblade Crest',
            type: 'legendary_artifact',
            rarity: 'epic',
            description: 'Infuses weapon attacks with +1d8 Radiant Damage and emits daylight dispelling shadows.',
            effect: 'damage_plus_1d8_radiant',
            quantity: 1
          },
          {
            id: 'gold_trove',
            name: 'Ancient Gold Hoard (250 gp)',
            type: 'consumable',
            rarity: 'rare',
            description: 'Ornate bullion and uncut sapphires.',
            quantity: 1
          }
        ]
      }
    ],
    prisonCells: [
      {
        id: 'cell_m1_9',
        cellNumber: 9,
        coordinate: { x: 20, y: 7 },
        roomId: 'm1_room_5',
        prisonerName: 'Lady Fiona of Highwater',
        isUnlocked: false,
        rewardGold: 40,
        flavorQuote: 'Malakor kept us here to sacrifice our life essence! Cut him down!'
      },
      {
        id: 'cell_m1_10',
        cellNumber: 10,
        coordinate: { x: 25, y: 12 },
        roomId: 'm1_room_5',
        prisonerName: 'Archmage Theron (Captive)',
        isUnlocked: false,
        rewardGold: 50,
        flavorQuote: 'All ten captives are delivered from darkness! The dungeon stands broken!'
      }
    ],
    isExplored: false,
    flavorText: 'An imposing obsidian sarcophagus looms in the center. Two glowing Bone Pillars illuminate the armored wight levitating above the altar!',
    isBossRoom: true,
    bossEncounter: {
      bossMonsterId: 'boss_malakor',
      bossName: 'Malakor the Bone Lord',
      title: 'The Bone Shield of Malakor',
      currentPhase: 1,
      totalPhases: 2,
      defeatCondition: 'deactivate_pillars_then_kill',
      pillarsToDeactivate: [
        { coordinate: { x: 21, y: 8 }, isDeactivated: false },
        { coordinate: { x: 21, y: 12 }, isDeactivated: false }
      ],
      phaseMechanics: [
        {
          phaseNumber: 1,
          hpThresholdPercentage: 100,
          mechanicName: 'Bone Aegis Shield',
          description: 'Malakor is shielded by dark runes channeled through 2 Crypt Pillars. Heroes must spend an Interact action adjacent to each Pillar to smash them and lower his shield!',
          shieldActive: true
        },
        {
          phaseNumber: 2,
          hpThresholdPercentage: 50,
          mechanicName: 'Desperation Necrotic Burst',
          description: 'Shield broken! Malakor enters an enraged state, gaining +2 attack roll bonus and unleashing Bone Shrapnel whenever damaged.',
          damageBonus: '+2'
        }
      ]
    }
  },
  {
    id: 'm1_room_6',
    roomIndex: 6,
    title: 'The Gilded Vault of the Red Wyrm',
    theme: 'Draconic Hoard of Molten Gold',
    origin: { x: 13, y: 0 },
    width: 6,
    height: 6,
    tiles: generateRoomTiles('m1_room_6', 13, 0, 6, 6, [{ x: 13, y: 2 }], 'gilded_floor'),
    edgeCoordinates: [
      {
        id: 'edge_r6_to_r2',
        type: 'edge_coordinate',
        coordinate: { x: 13, y: 2 },
        connectsToDirection: 'west',
        targetRoomIndex: 2,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'Heavy iron vault portcullis leads back to the Ossuary.'
      }
    ],
    monsters: [],
    hazards: [],
    traps: [],
    chests: [],
    isTreasureChamber: true,
    treasureHoard: {
      id: 'hoard_pyregold',
      coordinate: { x: 16, y: 3 },
      goldValue: 450,
      isLooted: false,
      legendaryItem: {
        id: 'loot_dragon_scale',
        name: 'Draconic Aegis Shield',
        type: 'armor',
        rarity: 'legendary',
        description: 'Imbued with crimson dragon scales (+2 AC and Fire Ward).',
        quantity: 1
      }
    },
    isExplored: false,
    flavorText: 'Piles of shimmering bullion, chalices, and gems illuminate the chamber in warm gold! But magical trigger runes pulse with an angry red luminescence—a dragon guardian stirs!',
    isBossRoom: false
  }
];

export const MODULE_1_CORE_SET: ModulePackage = {
  id: 'module_1_core',
  moduleNumber: 1,
  title: 'Module 1: The Crypt of the Bone Lord',
  subtitle: 'Core Set w/ Standard Foes',
  tierDescription: 'Tier 1 Adventure (Levels 1-3)',
  recommendedLevel: 'Level 1-2 Party',
  description: 'Introductory 5-room dungeon layout designed for DM-free cooperative play. Features predictable, algorithmic monster variants (Skeleton Patrol, Spider Ambush, Goblin Hit & Run), crumbling floor hazards, spike traps, and a shielded boss encounter.',
  rooms: MODULE_1_ROOMS,
  lootTable: [
    {
      id: 'loot_chainmail',
      name: 'Reinforced Mail',
      type: 'armor',
      rarity: 'rare',
      description: 'Increases wearer Armor Class to 16.',
      quantity: 1
    }
  ],
  environmentalSummary: {
    hazardName: 'Crumbling Floor',
    hazardRule: 'Each tile allows 2 footsteps before collapsing into a 10ft spike pit (1d6 bludgeoning, DC 12 DEX save).',
    trapName: 'Spike Trap Tripwire',
    trapRule: 'Stepping on coordinate triggers spring-loaded spikes (2d6 piercing, DC 13 DEX save, DC 12 Perception to spot).',
    bossMechanicName: 'Bone Shield & Crypt Pillars',
    bossMechanicRule: 'Boss is immune to all damage until party members spend Interact actions adjacent to both Crypt Pillars.'
  }
};

// -------------------------------------------------------------
// MODULE 2: ADVANCED SET (TIER 2 FOES + MINI BOSS REVEAL)
// -------------------------------------------------------------

export const MODULE_2_ADVANCED_SET: ModulePackage = {
  id: 'module_2_advanced',
  moduleNumber: 2,
  title: 'Module 2: Caverns of the Shadow Brood',
  subtitle: 'Advanced Set with Tier 2 Foes and Mini Boss Reveal',
  tierDescription: 'Tier 2 Adventure (Levels 4-6)',
  recommendedLevel: 'Level 4 Party',
  description: 'Expands into deeper subterranean hazards. Introduces Tier 2 monsters (Hobgoblin Warlords, Incorporeal Wraiths, Venom Trolls), a dramatic Mini-Boss ambush encounter (Shadow Stalker), corrosive acid pool hazards, and a rolling boulder trap.',
  rooms: [
    {
      id: 'm2_room_1',
      roomIndex: 1,
      title: 'The Acidic Incline',
      theme: 'Corrosive Cavern',
      origin: { x: 0, y: 0 },
      width: 7,
      height: 6,
      tiles: generateRoomTiles('m2_room_1', 0, 0, 7, 6, [{ x: 6, y: 3 }]),
      edgeCoordinates: [
        {
          id: 'edge_m2_r1_to_r2',
          type: 'edge_coordinate',
          coordinate: { x: 6, y: 3 },
          connectsToDirection: 'east',
          targetRoomIndex: 2,
          isTriggered: false,
          spawnRule: 'spawns_on_occupy',
          leadText: 'Echoes of clashing iron and battle horns ring from the eastern barracks.'
        }
      ],
      monsters: [
        {
          id: 'mon_hobgob_1',
          templateId: 'hobgoblin_soldier',
          name: 'Hobgoblin Phalanx Guard',
          monsterType: 'hobgoblin',
          tier: 2,
          hp: 24,
          maxHp: 24,
          ac: 17,
          speed: 6,
          position: { x: 4, y: 3 },
          isAlive: true,
          ai: {
            behaviorType: 'chase',
            targetingRule: 'nearest',
            preferredRange: 1,
            actions: [
              {
                triggerCondition: 'always',
                actionType: 'move',
                moveDistance: 5
              },
              {
                triggerCondition: 'in_attack_range',
                actionType: 'attack',
                attackRange: 1,
                damageDice: '1d10+3',
                hitBonus: 6
              }
            ]
          },
          attacks: [
            {
              id: 'hob_halberd',
              name: 'Martial Halberd',
              range: 1,
              attackBonus: 6,
              damageDice: '1d10+3',
              damageType: 'slashing',
              description: 'Disciplined military strike.'
            }
          ],
          specialAbilities: ['Martial Advantage (+2d6 damage if ally adjacent)'],
          statusEffects: [],
          threatLevel: 3,
          experienceReward: 200
        }
      ],
      hazards: [
        {
          id: 'haz_acid_1',
          type: 'acid_pool',
          name: 'Bubbling Acid Vent',
          coordinate: { x: 3, y: 2 },
          roomId: 'm2_room_1',
          currentIntegrity: 1,
          maxIntegrity: 1,
          state: 'active',
          damageOnTrigger: '2d6',
          damageType: 'acid',
          savingThrowDC: 14,
          saveAttribute: 'dex',
          description: 'Stepping into the acidic liquid deals 2d6 acid damage and reduces AC by 1 until end of turn.'
        }
      ],
      traps: [],
      chests: [],
      isExplored: true,
      flavorText: 'Green vapours swirl above stagnant lime pools. The iron disciplined tread of hobgoblin boots draws near.',
      isBossRoom: false
    },
    {
      id: 'm2_room_2',
      roomIndex: 2,
      title: 'The Shadow Corridor (Mini-Boss Reveal)',
      theme: 'Abyssal Shadows',
      origin: { x: 7, y: 0 },
      width: 8,
      height: 7,
      tiles: generateRoomTiles('m2_room_2', 7, 0, 8, 7, [{ x: 7, y: 3 }, { x: 14, y: 3 }]),
      edgeCoordinates: [
        {
          id: 'edge_m2_r2_to_r3',
          type: 'edge_coordinate',
          coordinate: { x: 14, y: 3 },
          connectsToDirection: 'east',
          targetRoomIndex: 3,
          isTriggered: false,
          spawnRule: 'spawns_on_occupy',
          leadText: 'Heavy stone gate reinforced against boulder strikes.'
        }
      ],
      monsters: [
        {
          id: 'mini_boss_stalker',
          templateId: 'shadow_stalker',
          name: 'The Shadow Stalker (Mini-Boss)',
          monsterType: 'wraith',
          tier: 2,
          hp: 42,
          maxHp: 42,
          ac: 15,
          speed: 7,
          position: { x: 11, y: 3 },
          isAlive: true,
          isBoss: true,
          ai: {
            behaviorType: 'ambush',
            targetingRule: 'isolated',
            preferredRange: 1,
            ambushConfig: {
              isStealthed: true,
              revealRange: 2,
              surpriseBonusDamage: '2d8',
              retreatAfterAttackSquares: 3
            },
            actions: [
              {
                triggerCondition: 'in_attack_range',
                actionType: 'attack',
                attackRange: 1,
                damageDice: '2d8+3',
                hitBonus: 7,
                effectDescription: 'Shadow Blade: 2d8+3 necrotic damage + shadow step 3 squares away'
              }
            ]
          },
          attacks: [
            {
              id: 'stalker_daggers',
              name: 'Shadow Daggers',
              range: 1,
              attackBonus: 7,
              damageDice: '2d8+3',
              damageType: 'necrotic',
              description: 'Twin blades of condensed darkness.'
            }
          ],
          specialAbilities: ['Shadow Step (Teleport)', 'Cloak of Mists', 'Backstab Critical'],
          statusEffects: [],
          threatLevel: 4,
          experienceReward: 450
        }
      ],
      hazards: [],
      traps: [
        {
          id: 'trap_boulder_1',
          type: 'pressure_boulder',
          name: 'Pressure Plate Boulder Release',
          coordinate: { x: 10, y: 3 },
          roomId: 'm2_room_2',
          isDetected: false,
          isDisarmed: false,
          isTriggered: false,
          perceptionDC: 14,
          disarmDC: 15,
          damageDice: '3d8',
          damageType: 'bludgeoning',
          savingThrowDC: 14,
          saveAttribute: 'dex',
          description: 'A raised flagstone activates a massive 5-ton spherical boulder hurtling down the 3-wide hallway!'
        }
      ],
      chests: [
        {
          id: 'chest_m2_r2',
          coordinate: { x: 13, y: 5 },
          isOpened: false,
          isLocked: true,
          unlockDC: 14,
          loot: [
            {
              id: 'item_ring_shadows',
              name: 'Ring of Evasion',
              type: 'armor',
              rarity: 'rare',
              description: 'Allows wearer to automatically succeed 1 DEX saving throw per combat.',
              quantity: 1
            }
          ]
        }
      ],
      isExplored: false,
      flavorText: 'Torches extinguish simultaneously. Whispering voices surround the party as eyes gleam from the ceiling!',
      isBossRoom: false
    },
    {
      id: 'm2_room_3',
      roomIndex: 3,
      title: "Broodmother's Hive",
      theme: 'Chitinous Hive',
      origin: { x: 15, y: 0 },
      width: 9,
      height: 8,
      tiles: generateRoomTiles('m2_room_3', 15, 0, 9, 8, [{ x: 15, y: 3 }]),
      edgeCoordinates: [],
      monsters: [
        {
          id: 'boss_broodmother',
          templateId: 'broodmother_arachna',
          name: 'Broodmother Arachna (Tier 2 Boss)',
          monsterType: 'boss',
          tier: 2,
          hp: 75,
          maxHp: 75,
          ac: 16,
          speed: 6,
          position: { x: 20, y: 4 },
          isAlive: true,
          isBoss: true,
          ai: {
            behaviorType: 'boss_phased',
            targetingRule: 'lowest_hp',
            preferredRange: 2,
            actions: [
              {
                triggerCondition: 'always',
                actionType: 'special_ability',
                specialAbilityName: 'Cocoon Web Snare',
                attackRange: 5,
                savingThrowDC: 14,
                effectDescription: 'Target hero is entangled in thick webbing, taking 1d6 acid per turn until cut free'
              },
              {
                triggerCondition: 'in_attack_range',
                actionType: 'attack',
                attackRange: 1,
                damageDice: '2d8+4',
                hitBonus: 7
              }
            ]
          },
          attacks: [
            {
              id: 'brood_bite',
              name: 'Corrosive Mandibles',
              range: 1,
              attackBonus: 7,
              damageDice: '2d8+4',
              damageType: 'piercing',
              description: 'Infects target with flesh-melting enzymes.'
            }
          ],
          specialAbilities: ['Hatchling Summon', 'Acid Spew', 'Web Wall'],
          statusEffects: [],
          threatLevel: 6,
          experienceReward: 900
        }
      ],
      hazards: [],
      traps: [],
      chests: [
        {
          id: 'chest_m2_boss',
          coordinate: { x: 22, y: 2 },
          isOpened: false,
          isLocked: false,
          loot: [
            {
              id: 'item_venom_glaive',
              name: 'Brood-Fang Glaive +2',
              type: 'weapon',
              rarity: 'epic',
              description: 'Reach weapon dealing +2d6 Poison damage on critical hits.',
              quantity: 1
            }
          ]
        }
      ],
      isExplored: false,
      flavorText: 'Pulsing egg sacs cling to towering stalagmites. The colossal matriarch descends, clicking razor sharp pedipalps in hunger.',
      isBossRoom: true,
      bossEncounter: {
        bossMonsterId: 'boss_broodmother',
        bossName: 'Broodmother Arachna',
        title: 'The Web of the Matriarch',
        currentPhase: 1,
        totalPhases: 2,
        defeatCondition: 'kill_boss',
        phaseMechanics: [
          {
            phaseNumber: 1,
            hpThresholdPercentage: 100,
            mechanicName: 'Acid Spray & Cocooning',
            description: 'Spits acid traps on hero positions and covers floor tiles with sticky webs.'
          },
          {
            phaseNumber: 2,
            hpThresholdPercentage: 40,
            mechanicName: 'Hive Swarm Enrage',
            description: 'Summons 3 Spider Hatchlings that relentlessly harass the party spellcaster!'
          }
        ]
      }
    }
  ],
  lootTable: [],
  environmentalSummary: {
    hazardName: 'Corrosive Acid Pools',
    hazardRule: 'Stepping into pools deals 2d6 acid damage and temporarily degrades armor by -1 AC.',
    trapName: 'Rolling Boulder Pressure Plate',
    trapRule: 'Stepping on coordinate triggers a 5-ton boulder dealing 3d8 bludgeoning in a 6-tile line (DC 14 DEX save).',
    bossMechanicName: 'Cocoon Snare & Hatching Waves',
    bossMechanicRule: 'Entangles lowest HP hero in acidic web while spawning swarm hatchlings at 40% HP.'
  }
};

// -------------------------------------------------------------
// MODULE 3: EPIC EXPANSION (COMBINED ROSTER + LEGENDARY LOOT + FINAL BOSS)
// -------------------------------------------------------------

export const MODULE_3_EPIC_EXPANSION: ModulePackage = {
  id: 'module_3_epic',
  moduleNumber: 3,
  title: 'Module 3: The Arch-Lich Citadel',
  subtitle: 'Epic Expansion with Combined Roster & Legendary Loot',
  tierDescription: 'Tier 3 Adventure (Levels 7-10)',
  recommendedLevel: 'Level 8 Party',
  description: 'The definitive climax. Combines skeletons, goblins, giant spiders, hobgoblins, wraiths, and the shadow stalker mini-boss. Features legendary artifact loot tables and the three-phased epic boss fight against Arch-Lich Valgoth.',
  rooms: [
    {
      id: 'm3_room_1',
      roomIndex: 1,
      title: 'Citadel Bastion',
      theme: 'Obsidian Fortress',
      origin: { x: 0, y: 0 },
      width: 8,
      height: 7,
      tiles: generateRoomTiles('m3_room_1', 0, 0, 8, 7, [{ x: 7, y: 3 }]),
      edgeCoordinates: [
        {
          id: 'edge_m3_r1_to_r2',
          type: 'edge_coordinate',
          coordinate: { x: 7, y: 3 },
          connectsToDirection: 'east',
          targetRoomIndex: 2,
          isTriggered: false,
          spawnRule: 'spawns_on_occupy',
          leadText: 'Ascending bridge spanning a bottomless chasm into the Throne of Eternity.'
        }
      ],
      monsters: [
        {
          id: 'mon_epic_wraith',
          templateId: 'dread_wraith',
          name: 'Dread Wraith Inquisitor',
          monsterType: 'wraith',
          tier: 3,
          hp: 36,
          maxHp: 36,
          ac: 15,
          speed: 7,
          position: { x: 4, y: 2 },
          isAlive: true,
          ai: {
            behaviorType: 'chase',
            targetingRule: 'highest_threat',
            preferredRange: 1,
            actions: [
              {
                triggerCondition: 'in_attack_range',
                actionType: 'attack',
                attackRange: 1,
                damageDice: '3d6+3',
                hitBonus: 7,
                effectDescription: 'Life Drain: 3d6+3 necrotic and target maximum HP is reduced'
              }
            ]
          },
          attacks: [
            {
              id: 'wraith_drain',
              name: 'Life Drain Touch',
              range: 1,
              attackBonus: 7,
              damageDice: '3d6+3',
              damageType: 'necrotic',
              description: 'Icy fingers chill the soul to its foundation.'
            }
          ],
          specialAbilities: ['Incorporeal Movement', 'Sunlight Sensitivity'],
          statusEffects: [],
          threatLevel: 5,
          experienceReward: 600
        },
        {
          id: 'mon_epic_hob',
          templateId: 'hobgoblin_warlord',
          name: 'Warlord Ghorbash',
          monsterType: 'hobgoblin',
          tier: 3,
          hp: 44,
          maxHp: 44,
          ac: 18,
          speed: 6,
          position: { x: 5, y: 4 },
          isAlive: true,
          ai: {
            behaviorType: 'patrol',
            targetingRule: 'nearest',
            preferredRange: 1,
            patrolWaypoints: [{ x: 5, y: 4 }, { x: 3, y: 4 }],
            currentPatrolIndex: 0,
            actions: [
              {
                triggerCondition: 'in_attack_range',
                actionType: 'attack',
                attackRange: 1,
                damageDice: '2d6+4',
                hitBonus: 8
              }
            ]
          },
          attacks: [
            {
              id: 'warlord_greatsword',
              name: 'Executioner Greatsword',
              range: 1,
              attackBonus: 8,
              damageDice: '2d6+4',
              damageType: 'slashing',
              description: 'Crushing overhead swing.'
            }
          ],
          specialAbilities: ['Rally Allies (+2 to hit for monsters)'],
          statusEffects: [],
          threatLevel: 5,
          experienceReward: 700
        }
      ],
      hazards: [
        {
          id: 'haz_miasma_1',
          type: 'toxic_miasma',
          name: 'Necrotic Miasma Chimney',
          coordinate: { x: 3, y: 5 },
          roomId: 'm3_room_1',
          currentIntegrity: 1,
          maxIntegrity: 1,
          state: 'active',
          damageOnTrigger: '2d8',
          damageType: 'poison',
          savingThrowDC: 15,
          saveAttribute: 'con',
          description: 'Dark green haze choking living creatures for 2d8 poison damage (DC 15 CON save).'
        }
      ],
      traps: [
        {
          id: 'trap_rune_1',
          type: 'arcane_rune',
          name: 'Glyph of Disintegration',
          coordinate: { x: 6, y: 3 },
          roomId: 'm3_room_1',
          isDetected: false,
          isDisarmed: false,
          isTriggered: false,
          perceptionDC: 15,
          disarmDC: 16,
          damageDice: '4d6',
          damageType: 'force',
          savingThrowDC: 15,
          saveAttribute: 'dex',
          description: 'Glowing sapphire ward runes detonate on contact dealing 4d6 force damage.'
        }
      ],
      chests: [
        {
          id: 'chest_epic_1',
          coordinate: { x: 1, y: 1 },
          isOpened: false,
          isLocked: false,
          loot: [
            {
              id: 'loot_legendary_sunblade',
              name: 'Sunblade of the Dawn (Legendary)',
              type: 'legendary_artifact',
              rarity: 'legendary',
              description: 'Hilt of pure platinum that manifests a blade of pure sunlight (+2 to hit, +2d8 Radiant damage vs undead).',
              effect: 'damage_plus_2d8_radiant',
              quantity: 1
            }
          ]
        }
      ],
      isExplored: true,
      flavorText: 'Towering obsidian pillars channel crackling violet lightning. The Citadel trembles with otherworldly necrotic energy.',
      isBossRoom: false
    },
    {
      id: 'm3_room_2',
      roomIndex: 2,
      title: 'Throne of the Arch-Lich',
      theme: 'Cosmic Soul Forge',
      origin: { x: 8, y: 0 },
      width: 10,
      height: 9,
      tiles: generateRoomTiles('m3_room_2', 8, 0, 10, 9, [{ x: 8, y: 3 }]),
      edgeCoordinates: [],
      monsters: [
        {
          id: 'boss_valgoth',
          templateId: 'arch_lich_valgoth',
          name: 'Arch-Lich Valgoth (Final Boss)',
          monsterType: 'boss',
          tier: 3,
          hp: 110,
          maxHp: 110,
          ac: 17,
          speed: 6,
          position: { x: 14, y: 4 },
          isAlive: true,
          isBoss: true,
          ai: {
            behaviorType: 'boss_phased',
            targetingRule: 'lowest_hp',
            preferredRange: 4,
            actions: [
              {
                triggerCondition: 'always',
                actionType: 'special_ability',
                specialAbilityName: 'Chain Disintegration',
                attackRange: 6,
                damageDice: '3d8+4',
                hitBonus: 8,
                effectDescription: 'Fires prismatic beam bouncing between heroes'
              },
              {
                triggerCondition: 'in_attack_range',
                actionType: 'attack',
                attackRange: 1,
                damageDice: '2d8+5',
                hitBonus: 8,
                effectDescription: 'Paralyzing Death Touch'
              }
            ]
          },
          attacks: [
            {
              id: 'valgoth_touch',
              name: 'Paralyzing Death Touch',
              range: 1,
              attackBonus: 8,
              damageDice: '2d8+5',
              damageType: 'necrotic',
              description: 'Drains the very lifeforce and immobilizes target.'
            },
            {
              id: 'valgoth_ray',
              name: 'Disintegration Ray',
              range: 5,
              attackBonus: 8,
              damageDice: '3d8+4',
              damageType: 'force',
              description: 'Beam of emerald annihilation.'
            }
          ],
          specialAbilities: ['Phylactery Soul Weave', 'Mirror Images', 'Death Gaze DC 15'],
          statusEffects: [],
          threatLevel: 8,
          experienceReward: 2500
        }
      ],
      hazards: [],
      traps: [],
      chests: [
        {
          id: 'chest_epic_vault',
          coordinate: { x: 16, y: 2 },
          isOpened: false,
          isLocked: false,
          loot: [
            {
              id: 'loot_staff_magi',
              name: 'Staff of the Magi (Legendary)',
              type: 'legendary_artifact',
              rarity: 'legendary',
              description: 'Provides +2 AC, spell absorption, and empowers Wizard spells by +10 damage.',
              quantity: 1
            },
            {
              id: 'loot_cloak_disp',
              name: 'Cloak of Displacement (Legendary)',
              type: 'legendary_artifact',
              rarity: 'legendary',
              description: 'Projects an illusionary duplicate: all incoming attacks have disadvantage.',
              quantity: 1
            }
          ]
        }
      ],
      isExplored: false,
      flavorText: 'Floating before a swirling cosmic vortex, Arch-Lich Valgoth turns his hollow skull towards you, gem-encrusted sockets blazing with cold fire.',
      isBossRoom: true,
      bossEncounter: {
        bossMonsterId: 'boss_valgoth',
        bossName: 'Arch-Lich Valgoth',
        title: 'The Three Trials of Valgoth',
        currentPhase: 1,
        totalPhases: 3,
        defeatCondition: 'kill_boss',
        phaseMechanics: [
          {
            phaseNumber: 1,
            hpThresholdPercentage: 100,
            mechanicName: 'Phase 1: Arcane Mirror Images',
            description: 'Valgoth projects 3 mirror duplicates that absorb attacks. Hits have a 50% chance to disperse an image instead of harming him.'
          },
          {
            phaseNumber: 2,
            hpThresholdPercentage: 65,
            mechanicName: 'Phase 2: Soul Harvest Summoning',
            description: 'Draws souls from the vortex, summoning 2 Skeletal Guardians and shielding himself for 20 temporary HP!'
          },
          {
            phaseNumber: 3,
            hpThresholdPercentage: 30,
            mechanicName: 'Phase 3: Death Gaze & Cataclysm',
            description: 'Empowered with doom! At the start of each monster turn, all heroes within 5 squares must roll DC 15 CON save or take 3d6 necrotic damage.'
          }
        ]
      }
    }
  ],
  lootTable: [],
  environmentalSummary: {
    hazardName: 'Necrotic Miasma Chimney',
    hazardRule: 'Choking dark vapours deal 2d8 poison damage and block line of sight across affected squares.',
    trapName: 'Glyph of Disintegration',
    trapRule: 'Stepping on arcane glyph detonates 4d6 force damage (DC 15 DEX save for half, DC 15 Perception to detect).',
    bossMechanicName: 'Three-Phase Lich Metamorphosis',
    bossMechanicRule: 'Phase 1 Mirror Images -> Phase 2 Soul Ward & Skeletal Minions -> Phase 3 Area Death Gaze.'
  }
};

// -------------------------------------------------------------
// MODULE 4: SOLO-ONLY CRUCIBLE OF THE RED CONQUEROR
// -------------------------------------------------------------
// Structure:
// Room 1: The Stele of Ultimatum (Entrance Hall - Safe Zone with Death=Zero Returns warning stele)
// Room 2: The Vault of Temptation (Treasure Room - High reward chest guarded by DC 12/13 trap)
// Room 3: The Crimson Gauntlet (Monster Corridor - 2 Chase-type foes testing resource management)
// Room 4: The Hall of Fractured Ruin (Trap Room - Crumbling floor hazard + spring-spike trap with perception hints)
// Room 5: The Sanctuary of Respite (Rest Point - Limited single Short Rest recovering 14 HP & ability cooldowns)
// Room 6: The Throne of Conquest (Boss Room - General Vaelok 2-Phase encounter with Blood Obelisks Aegis & Blood-Rage)

export const MODULE_4_ROOMS: RoomDataBlock[] = [
  {
    id: 'm4_room_1',
    roomIndex: 1,
    title: 'The Stele of Ultimatum',
    theme: 'Volcanic Obsidian Antechamber',
    origin: { x: 0, y: 0 },
    width: 6,
    height: 6,
    tiles: generateRoomTiles('m4_room_1', 0, 0, 6, 6, [{ x: 5, y: 3 }]),
    edgeCoordinates: [
      {
        id: 'edge_m4_r1_to_r2',
        type: 'edge_coordinate',
        coordinate: { x: 5, y: 3 },
        connectsToDirection: 'east',
        targetRoomIndex: 2,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'Reinforced iron archway leads toward the Vault of Temptation...'
      }
    ],
    monsters: [],
    hazards: [],
    traps: [],
    chests: [],
    warningStele: {
      coordinate: { x: 2, y: 2 },
      title: 'The Stele of Ultimatum',
      message: 'WARNING TO THE SOLO CHALLENGER: Death = zero returns. All spoils gathered during this trial are held in escrow and forfeit upon death. Only conquering General Vaelok at the heart of the Crucible settles your expedition loot and issues the official Voucher for the Robe of Conquest-Red.'
    },
    isExplored: true,
    flavorText: 'An ominous volcanic stone stele stands before the iron gates, inscribed with blood-red runes of ultimatum: "Death Means Zero Returns".',
    isBossRoom: false
  },
  {
    id: 'm4_room_2',
    roomIndex: 2,
    title: 'The Vault of Temptation',
    theme: 'Trapped Treasure Grotto',
    origin: { x: 6, y: 0 },
    width: 7,
    height: 6,
    tiles: generateRoomTiles('m4_room_2', 6, 0, 7, 6, [{ x: 6, y: 3 }, { x: 12, y: 3 }]),
    edgeCoordinates: [
      {
        id: 'edge_m4_r2_to_r3',
        type: 'edge_coordinate',
        coordinate: { x: 12, y: 3 },
        connectsToDirection: 'east',
        targetRoomIndex: 3,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'A blood-spattered corridor stretches eastward into darkness...'
      }
    ],
    monsters: [],
    hazards: [],
    traps: [
      {
        id: 'trap_m4_vault_spike',
        type: 'spike_pit',
        name: 'Concealed Barbed Pit',
        coordinate: { x: 9, y: 2 },
        roomId: 'm4_room_2',
        isDetected: false,
        isDisarmed: false,
        isTriggered: false,
        perceptionDC: 12,
        disarmDC: 13,
        damageDice: '2d6',
        damageType: 'piercing',
        savingThrowDC: 13,
        saveAttribute: 'dex',
        description: 'Concealed spring-loaded floor spikes guarding the treasure coffer.'
      }
    ],
    chests: [
      {
        id: 'chest_m4_vault',
        coordinate: { x: 10, y: 2 },
        isOpened: false,
        isLocked: true,
        unlockDC: 13,
        goldReward: 80,
        loot: [
          {
            id: 'pot_greater_solo',
            name: 'Potion of Greater Healing',
            type: 'consumable',
            rarity: 'rare',
            description: 'Restores 4d4+4 Hit Points when consumed as an interact action.',
            effect: 'heal_4d4_4',
            quantity: 1
          },
          {
            id: 'elixir_haste_solo',
            name: 'Elixir of Swift Haste',
            type: 'consumable',
            rarity: 'common',
            description: 'Quaff as an interact action to immediately restore 6 squares of movement.',
            quantity: 1
          }
        ]
      }
    ],
    isExplored: false,
    flavorText: 'An ornate brass-bound coffer sits enticingly on a raised pedestal. Treacherous scratch marks indicate concealed floor triggers.',
    isBossRoom: false
  },
  {
    id: 'm4_room_3',
    roomIndex: 3,
    title: 'The Crimson Gauntlet',
    theme: 'Bloodhound Corridor',
    origin: { x: 13, y: 0 },
    width: 8,
    height: 5,
    tiles: generateRoomTiles('m4_room_3', 13, 0, 8, 5, [{ x: 13, y: 3 }, { x: 20, y: 2 }]),
    edgeCoordinates: [
      {
        id: 'edge_m4_r3_to_r4',
        type: 'edge_coordinate',
        coordinate: { x: 20, y: 2 },
        connectsToDirection: 'east',
        targetRoomIndex: 4,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'A cracked stone archway leads into a chamber of decaying floors...'
      }
    ],
    monsters: [
      {
        id: 'm4_hound_1',
        templateId: 'dire_hound',
        name: 'Crucible Bloodhound',
        monsterType: 'hound',
        tier: 1,
        hp: 14,
        maxHp: 14,
        ac: 12,
        speed: 6,
        position: { x: 16, y: 1 },
        isAlive: true,
        isBoss: false,
        ai: {
          behaviorType: 'chase',
          targetingRule: 'nearest',
          preferredRange: 1,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 6 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d6+2', hitBonus: 4 }
          ]
        },
        attacks: [
          { id: 'atk_m4_bite', name: 'Rabid Bite', range: 1, attackBonus: 4, damageDice: '1d6+2', damageType: 'piercing', description: 'Vicious snapping jaws.' }
        ],
        specialAbilities: ['Relentless Scent'],
        statusEffects: [],
        threatLevel: 1,
        experienceReward: 90
      },
      {
        id: 'm4_marauder_1',
        templateId: 'hobgoblin_warrior',
        name: 'Crimson Marauder',
        monsterType: 'goblin',
        tier: 1,
        hp: 16,
        maxHp: 16,
        ac: 13,
        speed: 5,
        position: { x: 18, y: 3 },
        isAlive: true,
        isBoss: false,
        ai: {
          behaviorType: 'chase',
          targetingRule: 'nearest',
          preferredRange: 1,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 5 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d8+2', hitBonus: 4 }
          ]
        },
        attacks: [
          { id: 'atk_m4_halberd', name: 'Crucible Halberd', range: 1, attackBonus: 4, damageDice: '1d8+2', damageType: 'slashing', description: 'Heavy bladed polearm.' }
        ],
        specialAbilities: ['Tactical Strike'],
        statusEffects: [],
        threatLevel: 2,
        experienceReward: 110
      }
    ],
    hazards: [],
    traps: [],
    chests: [],
    isExplored: false,
    flavorText: 'Snarls echo down the basalt corridor as leashed war-hounds and watchful crimson sentinels rush to intercept you.',
    isBossRoom: false
  },
  {
    id: 'm4_room_4',
    roomIndex: 4,
    title: 'The Hall of Fractured Ruin',
    theme: 'Hazard & Trap Labyrinth',
    origin: { x: 21, y: 0 },
    width: 7,
    height: 6,
    tiles: generateRoomTiles('m4_room_4', 21, 0, 7, 6, [{ x: 21, y: 2 }, { x: 27, y: 3 }]),
    edgeCoordinates: [
      {
        id: 'edge_m4_r4_to_r5',
        type: 'edge_coordinate',
        coordinate: { x: 27, y: 3 },
        connectsToDirection: 'east',
        targetRoomIndex: 5,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'A warm golden glow emanates from a quiet chamber ahead...'
      }
    ],
    monsters: [],
    hazards: [
      {
        id: 'm4_hazard_crumble_1',
        type: 'crumbling_floor',
        name: 'Fractured Basalt Slab',
        coordinate: { x: 24, y: 2 },
        roomId: 'm4_room_4',
        currentIntegrity: 2,
        maxIntegrity: 2,
        state: 'stable',
        damageOnTrigger: '1d6',
        damageType: 'bludgeoning',
        savingThrowDC: 12,
        saveAttribute: 'dex',
        description: 'Thin basalt rock shelf hanging over a spiked abyss. Collapses under repeated weight.'
      }
    ],
    traps: [
      {
        id: 'm4_trap_spikes_1',
        type: 'spike_pit',
        name: 'Tripwire Spring-Spikes',
        coordinate: { x: 25, y: 4 },
        roomId: 'm4_room_4',
        isDetected: false,
        isDisarmed: false,
        isTriggered: false,
        perceptionDC: 12,
        disarmDC: 13,
        damageDice: '2d6',
        damageType: 'piercing',
        savingThrowDC: 13,
        saveAttribute: 'dex',
        description: 'Concealed tension cable tripping upward-thrusting steel spikes.'
      }
    ],
    chests: [],
    isExplored: false,
    flavorText: 'Spiderweb fissures cross the damp stones. Keen observation reveals faint tripwires and brittle flagstones before stepping blindly.',
    isBossRoom: false
  },
  {
    id: 'm4_room_5',
    roomIndex: 5,
    title: 'The Sanctuary of Respite',
    theme: 'Hearth of the Champion',
    origin: { x: 28, y: 0 },
    width: 6,
    height: 6,
    tiles: generateRoomTiles('m4_room_5', 28, 0, 6, 6, [{ x: 28, y: 3 }, { x: 33, y: 3 }]),
    edgeCoordinates: [
      {
        id: 'edge_m4_r5_to_r6',
        type: 'edge_coordinate',
        coordinate: { x: 33, y: 3 },
        connectsToDirection: 'east',
        targetRoomIndex: 6,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'Massive iron doors forged with warlord crests lead to the Conqueror\'s Throne...'
      }
    ],
    monsters: [],
    hazards: [],
    traps: [],
    chests: [],
    restPoint: {
      id: 'm4_rest_shrine',
      coordinate: { x: 30, y: 2 },
      name: 'Shrine of the Resolute Heart',
      isUsed: false,
      hpRestore: 14
    },
    isExplored: false,
    flavorText: 'A sacred warm brazier burns here, offering a single Short Rest opportunity to restore +14 HP and recharge all abilities before the final battle.',
    isBossRoom: false
  },
  {
    id: 'm4_room_6',
    roomIndex: 6,
    title: 'The Throne of the Red Conqueror',
    theme: 'Crimson Amphitheater',
    origin: { x: 34, y: 0 },
    width: 8,
    height: 8,
    tiles: generateRoomTiles('m4_room_6', 34, 0, 8, 8, [{ x: 34, y: 3 }]),
    edgeCoordinates: [],
    hazards: [],
    traps: [],
    chests: [],
    isExplored: false,
    isBossRoom: true,
    bossEncounter: {
      bossMonsterId: 'boss_vaelok',
      bossName: 'General Vaelok, The Red Conqueror',
      title: 'The Crimson Duel of Conquest',
      currentPhase: 1,
      totalPhases: 2,
      defeatCondition: 'deactivate_pillars_then_kill',
      pillarsToDeactivate: [
        { coordinate: { x: 37, y: 2 }, isDeactivated: false },
        { coordinate: { x: 37, y: 5 }, isDeactivated: false }
      ],
      phaseMechanics: [
        {
          phaseNumber: 1,
          hpThresholdPercentage: 100,
          mechanicName: 'Phase 1: Crimson Obelisk Aegis',
          description: 'Vaelok channels the twin Blood Obelisks! The Crimson Aegis deflects all incoming attacks until both obelisks are shattered via hero Interact action!'
        },
        {
          phaseNumber: 2,
          hpThresholdPercentage: 50,
          mechanicName: 'Phase 2: Blazing Blood-Rage',
          description: 'Below 50% HP, Vaelok hurls away his shield in fury! Attacks gain +1d6 fire damage, AC shifts to 13, and speed increases to 6!'
        }
      ]
    },
    monsters: [
      {
        id: 'boss_vaelok',
        templateId: 'conqueror_warlord',
        name: 'General Vaelok, The Red Conqueror',
        monsterType: 'hobgoblin',
        tier: 2,
        hp: 38,
        maxHp: 38,
        ac: 14,
        speed: 5,
        position: { x: 39, y: 3 },
        isAlive: true,
        isBoss: true,
        ai: {
          behaviorType: 'boss_phased',
          targetingRule: 'nearest',
          preferredRange: 1,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 5 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d8+3', hitBonus: 5 }
          ]
        },
        attacks: [
          { id: 'atk_vaelok_glaive', name: "Conqueror's Glaive", range: 1, attackBonus: 5, damageDice: '1d8+3', damageType: 'slashing', description: 'Heavy blood-etched war glaive.' },
          { id: 'atk_vaelok_cleave', name: 'Crimson Cleave', range: 1, attackBonus: 5, damageDice: '1d8+1d6+3', damageType: 'fire', description: 'Enraged sweeping strike engulfed in searing embers.' }
        ],
        specialAbilities: ['Crimson Aegis', 'Blood-Rage Enrage'],
        statusEffects: [],
        threatLevel: 4,
        experienceReward: 450
      }
    ],
    flavorText: 'Crimson war banners hang from obsidian pillars. General Vaelok stands ready on the amphitheater dais, surrounded by protective bloodstone obelisks.'
  }
];

export const MODULE_4_SOLO_CRUCIBLE: ModulePackage = {
  id: 'module_4_solo_crucible',
  moduleNumber: 4,
  title: 'Module 4: Crucible of the Red Conqueror',
  subtitle: 'Solo Trial of Endurance, Lethal Hazards & Phased Combat',
  tierDescription: 'High-Risk Solo Module (Level 2-3 Champion)',
  recommendedLevel: 'Solo Hero (Level 2-3)',
  description: 'A punishing solo-only gauntlet designed with narrow error margins. Death forfeits all expedition loot; clearance issues the official Voucher for the Robe of Conquest-Red (+10% damage).',
  isSoloOnly: true,
  completionRewards: {
    voucherId: 'voucher_robe_of_conquest_red',
    voucherName: 'Voucher: Robe of Conquest-Red',
    gold: 350
  },
  rooms: MODULE_4_ROOMS,
  lootTable: [
    {
      id: 'voucher_robe_of_conquest_red',
      name: 'Voucher: Robe of Conquest-Red',
      type: 'relic',
      rarity: 'legendary',
      description: 'Official settlement voucher issued by the Guild upon clearing the Solo Crucible. Redeem at the Town Shop for the Robe of Conquest-Red.',
      quantity: 1
    }
  ],
  environmentalSummary: {
    hazardName: 'Fractured Basalt Pitfall',
    hazardRule: 'Cracked floor collapses on 2nd step into a 10ft spiked pit (1d6 bludgeoning, DC 12 DEX save or Prone).',
    trapName: 'Concealed Barbed Spikes & Tripwires',
    trapRule: 'Hidden pressure tiles trigger razor spikes dealing 2d6 piercing damage (DC 13 DEX save, DC 12 Perception to detect, DC 13 Thievery to disarm).',
    bossMechanicName: 'Two-Phase Obelisk Shield & Crimson Blood-Rage',
    bossMechanicRule: 'Phase 1: Blood Obelisks deflect all damage until deactivated via Interact. Phase 2: Below 50% HP, enters Blood-Rage dealing +1d6 fire damage.'
  }
};

// -------------------------------------------------------------
// MODULE 5: 《BLOOD DEBT》 MULTI-SESSION NARRATIVE SOLO MODULE
// -------------------------------------------------------------
// Act I: The Ruins (Rooms 1 & 2 - Choice about desperate survivors)
// Act II: The Trail (Rooms 3 & 4 - Choice to execute or let bandit leader escape)
// Act III: The Reckoning (Rooms 5 & 6 - Final boss identity changes based on Act I & II choices)

export const MODULE_5_ROOMS: RoomDataBlock[] = [
  // --- ACT I: THE RUINS ---
  {
    id: 'm5_room_1',
    roomIndex: 1,
    title: 'Act I: The Ashen Gatehouse',
    theme: 'Ruined Fortress Antechamber',
    origin: { x: 0, y: 0 },
    width: 6,
    height: 6,
    tiles: generateRoomTiles('m5_room_1', 0, 0, 6, 6, [{ x: 5, y: 2 }]),
    edgeCoordinates: [
      {
        id: 'edge_m5_r1_to_r2',
        type: 'edge_coordinate',
        coordinate: { x: 5, y: 2 },
        connectsToDirection: 'east',
        targetRoomIndex: 2,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'Crumbling limestone corridor opens into the ruined hospice...'
      }
    ],
    monsters: [
      {
        id: 'm5_ghoul_1',
        name: 'Ashen Ghoul',
        monsterType: 'undead',
        hp: 16,
        maxHp: 16,
        ac: 12,
        speed: 4,
        position: { x: 3, y: 1 },
        isAlive: true,
        ai: {
          behaviorType: 'melee_chase',
          targetingRule: 'nearest',
          preferredRange: 1,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 4 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d6+2', hitBonus: 4 }
          ]
        },
        attacks: [
          { id: 'atk_ghoul_claws', name: 'Corpse Claws', range: 1, attackBonus: 4, damageDice: '1d6+2', damageType: 'slashing', description: 'Rotting filth-crusted claws.' }
        ],
        specialAbilities: ['Paralyzing Chill'],
        statusEffects: [],
        threatLevel: 2,
        experienceReward: 120
      }
    ],
    hazards: [],
    traps: [],
    chests: [],
    warningStele: {
      coordinate: { x: 2, y: 2 },
      title: 'Stele of the Blood Ledger',
      message: 'THE BLOOD DEBT LAW: Every demise incurred inside this gauntlet increases your blood_debt. If you perish, gold earned this run is halved, but all permanent upgrades and narrative memory items are etched upon your soul and retained forever. Choose with purpose.'
    },
    isExplored: true,
    flavorText: 'Charred timber and shattered masonry litter the gates. A carved stele stands warning of the inescapable blood debt.',
    isBossRoom: false
  },
  {
    id: 'm5_room_2',
    roomIndex: 2,
    title: "Act I: Survivors' Crossroads",
    theme: 'Ruined Hospice of the Fallen',
    origin: { x: 6, y: 0 },
    width: 7,
    height: 6,
    tiles: generateRoomTiles('m5_room_2', 6, 0, 7, 6, [
      { x: 6, y: 2 }, // Entrance from room 1
      { x: 12, y: 3 } // Exit to room 3
    ]),
    edgeCoordinates: [
      {
        id: 'edge_m5_r2_to_r3',
        type: 'edge_coordinate',
        coordinate: { x: 12, y: 3 },
        connectsToDirection: 'east',
        targetRoomIndex: 3,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'A steep mountain scree trail ascends into the Whispering Defile...'
      }
    ],
    monsters: [
      {
        id: 'm5_ruin_scavenger',
        name: 'Feral Ruin Scavenger',
        monsterType: 'humanoid',
        hp: 18,
        maxHp: 18,
        ac: 13,
        speed: 5,
        position: { x: 10, y: 4 },
        isAlive: true,
        ai: {
          behaviorType: 'patrol_sentinel',
          targetingRule: 'nearest',
          preferredRange: 1,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 5 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d6+2', hitBonus: 4 }
          ]
        },
        attacks: [
          { id: 'atk_scavenger_hook', name: 'Barbed Meat Hook', range: 1, attackBonus: 4, damageDice: '1d6+2', damageType: 'piercing', description: 'Rusty iron hook designed for plundering.' }
        ],
        specialAbilities: [],
        statusEffects: [],
        threatLevel: 2,
        experienceReward: 140
      }
    ],
    hazards: [],
    traps: [],
    chests: [
      {
        id: 'chest_m5_r2',
        coordinate: { x: 11, y: 1 },
        isLocked: false,
        isOpen: false,
        trapped: false,
        goldReward: 60,
        loot: [
          { id: 'pot_heal_r2', name: 'Potion of Healing', type: 'consumable', rarity: 'common', description: 'Restores 2d4+2 HP.', effect: 'heal_2d4_2', quantity: 1 }
        ]
      }
    ],
    choiceEvent: {
      id: 'choice_act1_survivors',
      actNumber: 1,
      actTitle: 'Act I: The Ruins',
      title: 'The Crossroads of Despair: Wounded Survivors',
      speaker: 'Elder Moira & Fleeing Townsfolk',
      portrait: 'Heart',
      situationText: 'Huddled beneath a cracked roof, a band of wounded villagers and a weary herbalist bandage their kin. "Mercy, traveler! The bandit raiders burned our sanctuary. We have neither rations nor medicine to survive the night. What will you do with us?"',
      options: [
        {
          id: 'opt_act1_aid',
          text: 'Aid the Survivors (Share supplies & guide them to safety)',
          description: 'Bandage their wounds, provide sustenance, and point them to the frontier redoubt.',
          flagToSet: 'act1_survivors_aided',
          consequenceSummary: 'The villagers survive and spread tales of your nobility. In Act III, Commander Kaelen will recognize your honor.'
        },
        {
          id: 'opt_act1_plunder',
          text: 'Plunder & Purge (Seize their hidden emergency gold +80 GP)',
          description: 'Cold, mercenary resolve. Take their 80 GP pouch and leave no witnesses behind.',
          flagToSet: 'act1_survivors_plundered',
          goldChange: 80,
          consequenceSummary: 'You gain +80 GP. Their agonized souls coalesce in Act III into the terrifying Vengeful Wraith!'
        },
        {
          id: 'opt_act1_abandon',
          text: 'Abandon them to the mists (Indifference)',
          description: 'Turn a blind eye. Survival in this realm belongs only to the strong.',
          flagToSet: 'act1_survivors_abandoned',
          consequenceSummary: 'Left alone, their dying echoes summon the Corrupted Hollow Warden in Act III.'
        }
      ],
      isResolved: false
    },
    interactableObjects: [
      {
        id: 'obj_survivors_crossroads',
        type: 'choice_event',
        name: 'Wounded Survivors',
        coordinate: { x: 9, y: 2 },
        isUsed: false,
        description: 'A desperate family huddled beside a smoldering fire. Interact to decide their fate.'
      }
    ],
    isExplored: false,
    flavorText: 'A draft of cold wind sweeps through shattered stained glass. In the corner, huddled survivors look up at you with trembling hope or terror.',
    isBossRoom: false
  },

  // --- ACT II: THE TRAIL ---
  {
    id: 'm5_room_3',
    roomIndex: 3,
    title: 'Act II: The Whispering Defile',
    theme: 'Fog-Shrouded Mountain Ravine',
    origin: { x: 13, y: 1 },
    width: 8,
    height: 5,
    tiles: generateRoomTiles('m5_room_3', 13, 1, 8, 5, [
      { x: 13, y: 3 }, // Entrance from room 2
      { x: 20, y: 3 }  // Exit to room 4
    ]),
    edgeCoordinates: [
      {
        id: 'edge_m5_r3_to_r4',
        type: 'edge_coordinate',
        coordinate: { x: 20, y: 3 },
        connectsToDirection: 'east',
        targetRoomIndex: 4,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'Heavy iron-reinforced barricades guard the bandit leader’s redoubt...'
      }
    ],
    monsters: [
      {
        id: 'm5_trail_archer_1',
        name: 'Bandit Trail Archer',
        monsterType: 'humanoid',
        hp: 16,
        maxHp: 16,
        ac: 13,
        speed: 5,
        position: { x: 18, y: 2 },
        isAlive: true,
        ai: {
          behaviorType: 'ranged_kite',
          targetingRule: 'lowest_ac',
          preferredRange: 4,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 5 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 5, damageDice: '1d8+2', hitBonus: 4 }
          ]
        },
        attacks: [
          { id: 'atk_archer_bow', name: 'Yew Longbow', range: 5, attackBonus: 4, damageDice: '1d8+2', damageType: 'piercing', description: 'Jagged steel arrow whistling across the fog.' }
        ],
        specialAbilities: [],
        statusEffects: [],
        threatLevel: 2,
        experienceReward: 130
      }
    ],
    hazards: [
      {
        id: 'hazard_m5_scree',
        name: 'Crumbling Scree Rockfall',
        type: 'environmental',
        affectedCoordinates: [{ x: 16, y: 2 }, { x: 16, y: 3 }],
        isActive: true,
        damagePerTurn: '1d6',
        savingThrowDC: 12,
        savingThrowType: 'dex',
        description: 'Unstable gravel cliffside prone to sudden rock slides.'
      }
    ],
    traps: [
      {
        id: 'trap_m5_caltrop',
        coordinate: { x: 17, y: 3 },
        isDisarmed: false,
        isTriggered: false,
        perceptionDC: 12,
        disarmDC: 13,
        damageDice: '2d6',
        effectDescription: 'Concealed barbed wire and caltrops dealing 2d6 piercing damage.',
        detected: false
      }
    ],
    chests: [],
    isExplored: false,
    flavorText: 'Jagged stone teeth rise into the mist. The wind here sounds like hushed voices whispering warnings of ambush.',
    isBossRoom: false
  },
  {
    id: 'm5_room_4',
    roomIndex: 4,
    title: "Act II: The Outlaw's Parley",
    theme: 'Bandit Cliffside Redoubt',
    origin: { x: 21, y: 0 },
    width: 7,
    height: 7,
    tiles: generateRoomTiles('m5_room_4', 21, 0, 7, 7, [
      { x: 21, y: 3 }, // Entrance from room 3
      { x: 27, y: 3 }  // Exit to room 5
    ]),
    edgeCoordinates: [
      {
        id: 'edge_m5_r4_to_r5',
        type: 'edge_coordinate',
        coordinate: { x: 27, y: 3 },
        connectsToDirection: 'east',
        targetRoomIndex: 5,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'Ascend the stone stairs toward the high Sanctuary of the Scales...'
      }
    ],
    monsters: [
      {
        id: 'm5_bandit_enforcer',
        name: 'Ironclad Bandit Enforcer',
        monsterType: 'humanoid',
        hp: 24,
        maxHp: 24,
        ac: 14,
        speed: 4,
        position: { x: 24, y: 2 },
        isAlive: true,
        ai: {
          behaviorType: 'melee_chase',
          targetingRule: 'nearest',
          preferredRange: 1,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 4 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d10+3', hitBonus: 5 }
          ]
        },
        attacks: [
          { id: 'atk_enforcer_axe', name: 'Battleaxe of Ruin', range: 1, attackBonus: 5, damageDice: '1d10+3', damageType: 'slashing', description: 'Heavy double-bitted axe.' }
        ],
        specialAbilities: ['Shield Bash'],
        statusEffects: [],
        threatLevel: 3,
        experienceReward: 200
      }
    ],
    hazards: [],
    traps: [],
    chests: [
      {
        id: 'chest_m5_r4',
        coordinate: { x: 25, y: 5 },
        isLocked: false,
        isOpen: false,
        trapped: false,
        goldReward: 90,
        loot: [
          { id: 'elixir_haste_r4', name: 'Elixir of Swift Haste', type: 'consumable', rarity: 'common', description: 'Restores +6 movement.', quantity: 1 }
        ]
      }
    ],
    choiceEvent: {
      id: 'choice_act2_bandit',
      actNumber: 2,
      actTitle: 'Act II: The Trail',
      title: "The Bandit Leader's Parley",
      speaker: 'Malakar the Flayed',
      portrait: 'Skull',
      situationText: 'Cornered against a sheer basalt precipice, Malakar spits blood and lowers his dual scythe-blades. "Hold, champion! You fight like an archdemon. I hold a chest of 120 Guild gold taken from the road caravans. Look away, let me slip into the mist, and the gold is yours. Cross me, or execute me, and blood will drown this mountain."',
      options: [
        {
          id: 'opt_act2_execute',
          text: 'Execute Malakar (No mercy for cutthroats)',
          description: 'Slay the bandit leader with swift, unyielding justice.',
          flagToSet: 'act2_leader_executed',
          consequenceSummary: 'Malakar is slain. The mountain syndicate is broken, directing you to face the legal trial of the High Court in Act III.'
        },
        {
          id: 'opt_act2_escape',
          text: 'Accept Bribe & Let Him Flee (+120 GP)',
          description: 'Take his 120 GP bounty pouch and let him vanish down the mountain trail.',
          flagToSet: 'act2_leader_escaped',
          goldChange: 120,
          consequenceSummary: 'You gain +120 GP, but Malakar rallies the surviving raiders and ambushes you as Warlord of the Red Vengeance in Act III!'
        },
        {
          id: 'opt_act2_spared',
          text: 'Subdue with a Blood Oath (Enforce servitude)',
          description: 'Mark him with a crimson brand and force him to surrender his weapon.',
          flagToSet: 'act2_leader_spared',
          consequenceSummary: 'Malakar flees disgraced. The Arbiter in Act III will acknowledge your discipline.'
        }
      ],
      isResolved: false
    },
    interactableObjects: [
      {
        id: 'obj_bandit_leader_parley',
        type: 'choice_event',
        name: 'Malakar the Flayed',
        coordinate: { x: 25, y: 3 },
        isUsed: false,
        description: 'The wounded outlaw leader cornered at swordpoint. Interact to seal his fate.'
      }
    ],
    isExplored: false,
    flavorText: 'Campfires flicker in the outlaw stronghold. Malakar stands with his back to the drop, waiting for your verdict.',
    isBossRoom: false
  },

  // --- ACT III: THE RECKONING ---
  {
    id: 'm5_room_5',
    roomIndex: 5,
    title: 'Act III: Sanctuary of the Scales',
    theme: 'Ancient Alabaster Temple of Justice',
    origin: { x: 28, y: 1 },
    width: 6,
    height: 5,
    tiles: generateRoomTiles('m5_room_5', 28, 1, 6, 5, [
      { x: 28, y: 3 }, // Entrance from room 4
      { x: 33, y: 3 }  // Exit to room 6
    ]),
    edgeCoordinates: [
      {
        id: 'edge_m5_r5_to_r6',
        type: 'edge_coordinate',
        coordinate: { x: 33, y: 3 },
        connectsToDirection: 'east',
        targetRoomIndex: 6,
        isTriggered: false,
        spawnRule: 'spawns_on_occupy',
        leadText: 'The massive bronze Double Doors of Judgment groan open...'
      }
    ],
    monsters: [],
    hazards: [],
    traps: [],
    chests: [],
    restPoint: {
      id: 'rest_point_m5_altar',
      coordinate: { x: 30, y: 2 },
      name: 'Altar of the Crimson Scales',
      isUsed: false,
      hpRestore: 16
    },
    warningStele: {
      coordinate: { x: 31, y: 3 },
      title: 'Tome of the Converging Ledger',
      message: 'THE RECKONING AWAITS: In the hall beyond, the entity you face is forged directly from your deeds. Those who shed innocent blood meet their victims in fury; those who sold justice for gold face the traitor reborn. Pray your ledger is balanced.'
    },
    isExplored: false,
    flavorText: 'A hushed sanctuary bathed in crystalline light. Bloodstones glow upon an altar of balance, offering restorative peace before the trial of reckoning.',
    isBossRoom: false
  },
  {
    id: 'm5_room_6',
    roomIndex: 6,
    title: 'Act III: The Hall of Retribution',
    theme: 'Grand Colosseum of the Blood Court',
    origin: { x: 34, y: 0 },
    width: 9,
    height: 7,
    tiles: generateRoomTiles('m5_room_6', 34, 0, 9, 7, [
      { x: 34, y: 3 } // Entrance from room 5
    ]),
    edgeCoordinates: [],
    monsters: [
      // Base template - dynamically transformed in gameEngine based on narrative flags!
      {
        id: 'm5_boss_reckoning',
        name: 'The Arbiter of the Blood Debt',
        monsterType: 'construct',
        hp: 44,
        maxHp: 44,
        ac: 15,
        speed: 5,
        position: { x: 39, y: 3 },
        isAlive: true,
        isBoss: true,
        ai: {
          behaviorType: 'boss_phased',
          targetingRule: 'nearest',
          preferredRange: 1,
          actions: [
            { triggerCondition: 'always', actionType: 'move', moveDistance: 5 },
            { triggerCondition: 'in_attack_range', actionType: 'attack', attackRange: 1, damageDice: '1d10+4', hitBonus: 6 }
          ]
        },
        attacks: [
          { id: 'atk_reckoning_flail', name: 'Flail of Atonement', range: 1, attackBonus: 6, damageDice: '1d10+4', damageType: 'bludgeoning', description: 'Massive spiked flail swinging with gravitational force.' },
          { id: 'atk_reckoning_cleave', name: 'Execution Sweep', range: 1, attackBonus: 6, damageDice: '1d8+1d6+4', damageType: 'force', description: 'Sweeping arc cleaving through armor and spirit.' }
        ],
        specialAbilities: ['Aura of Retribution', 'Phase 2: Enraged Ledger'],
        statusEffects: [],
        threatLevel: 4,
        experienceReward: 500
      }
    ],
    hazards: [],
    traps: [],
    chests: [
      {
        id: 'chest_m5_boss_spoils',
        coordinate: { x: 41, y: 1 },
        isLocked: false,
        isOpen: false,
        trapped: false,
        goldReward: 250,
        loot: [
          { id: 'voucher_blood_debt_repaid', name: 'Voucher: Debt of Crimson Absolution', type: 'relic', rarity: 'legendary', description: 'Conquest voucher proving complete repayment of the Blood Debt.', quantity: 1 }
        ]
      }
    ],
    bossEncounter: {
      bossName: 'The Arbiter of the Blood Debt',
      distinctCombatMechanic: 'Dynamic Boss Metamorphosis (Identity changes based on Act I & II choices)',
      phases: [
        {
          phaseNumber: 1,
          hpThresholdPercentage: 100,
          mechanicName: 'Phase 1: Aegis of the Unpaid Ledger',
          description: 'The boss pulses with judicial wards, counter-striking melee attackers with 1d4 force damage.'
        },
        {
          phaseNumber: 2,
          hpThresholdPercentage: 50,
          mechanicName: 'Phase 2: Execution Protocol',
          description: 'Below 50% HP, the boss channels dark fury, dealing +1d6 extra damage on all successful strikes!'
        }
      ]
    },
    isExplored: false,
    flavorText: 'An imposing amphitheater lined with towering obsidian statutes holding scales of justice. The champion of reckoning awaits in the center ring.',
    isBossRoom: true
  }
];

export const MODULE_5_BLOOD_DEBT: ModulePackage = {
  id: 'module_5_blood_debt',
  moduleNumber: 5,
  title: 'Module 5: 《Blood Debt》',
  subtitle: 'Multi-Session Solo Narrative Gauntlet of Choices & Consequence',
  tierDescription: 'Branching Solo Narrative Campaign (Level 2-4 Champion)',
  recommendedLevel: 'Solo Hero (Level 2-4)',
  description: 'A multi-session narrative solo module divided into three acts: Act I "The Ruins" (choice about survivors), Act II "The Trail" (choice regarding the bandit leader), and Act III "The Reckoning" (final boss identity morphs based on choices). Death halves gold earned this run and increases blood_debt by 1, while retaining all permanent upgrades and narrative items.',
  isSoloOnly: true,
  completionRewards: {
    voucherId: 'voucher_blood_debt_repaid',
    voucherName: 'Voucher: Debt of Crimson Absolution',
    gold: 400
  },
  rooms: MODULE_5_ROOMS,
  lootTable: [
    {
      id: 'voucher_blood_debt_repaid',
      name: 'Voucher: Debt of Crimson Absolution',
      type: 'relic',
      rarity: 'legendary',
      description: 'Official seal of absolution granted upon conquering the final boss of 《Blood Debt》. Unlocks ultimate status at the Town Outfitter.',
      quantity: 1
    }
  ],
  environmentalSummary: {
    hazardName: 'Crumbling Mountain Scree',
    hazardRule: 'Unstable footing deals 1d6 bludgeoning damage (DC 12 DEX save).',
    trapName: 'Barbed Wire & Caltrop Snare',
    trapRule: 'Hidden pressure wire deals 2d6 piercing and immobilizes (DC 12 Perception, DC 13 Thievery).',
    bossMechanicName: 'Dynamic Narrative Boss Metamorphosis',
    bossMechanicRule: 'The boss identity (Warlord Malakar, Vengeful Wraith, Grand Inquisitor, or Arbiter) and attack profile are dynamically shaped by your choices in Acts I & II.'
  }
};

export const ALL_MODULES = [
  MODULE_1_CORE_SET,
  MODULE_2_ADVANCED_SET,
  MODULE_3_EPIC_EXPANSION,
  MODULE_4_SOLO_CRUCIBLE,
  MODULE_5_BLOOD_DEBT
];

