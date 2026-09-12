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

export const ALL_MODULES = [
  MODULE_1_CORE_SET,
  MODULE_2_ADVANCED_SET,
  MODULE_3_EPIC_EXPANSION
];
