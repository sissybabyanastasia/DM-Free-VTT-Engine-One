import { HeroCharacter } from '../types/schema';

export const INITIAL_HERO_PARTY: HeroCharacter[] = [
  {
    id: 'hero_fighter',
    name: 'Sir Gareth',
    classType: 'fighter',
    hp: 34,
    maxHp: 34,
    ac: 17,
    speed: 6, // 30ft in 5ft squares
    initiative: 12,
    position: { x: 1, y: 2 },
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
    portrait: '🛡️',
    color: '#3b82f6', // blue
    weapons: [
      {
        id: 'w_longsword',
        name: 'Steel Longsword',
        range: 1,
        attackBonus: 5,
        damageDice: '1d8+3',
        damageType: 'slashing',
        description: 'Dependable tempered blade. Melee reach (adjacent).'
      },
      {
        id: 'w_javelin',
        name: 'Throwing Javelin',
        range: 2,
        attackBonus: 4,
        damageDice: '1d6+3',
        damageType: 'piercing',
        description: 'Steel-tipped throwing javelin for short reach (range 2).'
      }
    ],
    abilities: [
      {
        id: 'ab_second_wind',
        name: 'Second Wind',
        actionCost: 'bonus',
        cooldownTurns: 2,
        currentCooldown: 0,
        range: 0,
        healAmount: '1d10+3',
        description: 'Draw on warrior stamina to regain 1d10+3 HP as a bonus action.',
        icon: 'Sparkles'
      },
      {
        id: 'ab_action_surge',
        name: 'Shield Bash',
        actionCost: 'action',
        cooldownTurns: 2,
        currentCooldown: 0,
        range: 1,
        damageDice: '1d6+3',
        description: 'Slams target with heavy tower shield, dealing 1d6+3 bludgeoning and knocking them back 1 square.',
        icon: 'Shield'
      }
    ],
    inventory: [
      {
        id: 'inv_pot_1',
        name: 'Potion of Healing',
        type: 'consumable',
        rarity: 'common',
        description: 'Restores 2d4+4 HP upon use.',
        effect: 'heal_2d4_4',
        quantity: 2
      }
    ]
  },
  {
    id: 'hero_rogue',
    name: 'Lyra Whisperfoot',
    classType: 'rogue',
    hp: 24,
    maxHp: 24,
    ac: 15,
    speed: 7, // High mobility
    initiative: 16,
    position: { x: 2, y: 3 },
    turnState: {
      moveRemaining: 7,
      maxMove: 7,
      hasMoved: false,
      actionsRemaining: 1,
      hasActed: false,
      interactsRemaining: 1,
      hasInteracted: false,
      bonusActionsRemaining: 1,
      hasDashed: false,
      statusEffects: []
    },
    portrait: '🗡️',
    color: '#10b981', // emerald
    weapons: [
      {
        id: 'w_shortbow',
        name: 'Elven Shortbow',
        range: 5,
        attackBonus: 5,
        damageDice: '1d6+3',
        damageType: 'piercing',
        description: 'Accurate rapid-fire bow with sneak attack potential.'
      },
      {
        id: 'w_daggers',
        name: 'Pair of Keen Daggers',
        range: 1,
        attackBonus: 5,
        damageDice: '1d4+3',
        damageType: 'piercing',
        description: 'Swift piercing blades.'
      }
    ],
    abilities: [
      {
        id: 'ab_cunning_action',
        name: 'Cunning Dash',
        actionCost: 'bonus',
        cooldownTurns: 1,
        currentCooldown: 0,
        range: 0,
        description: 'Double movement speed for the remainder of this turn.',
        icon: 'Footprints'
      },
      {
        id: 'ab_sneak_attack',
        name: 'Shadow Snipe',
        actionCost: 'action',
        cooldownTurns: 1,
        currentCooldown: 0,
        range: 5,
        damageDice: '2d6+3',
        description: 'Exploits enemy weak points for 2d6+3 deadly piercing damage.',
        icon: 'Crosshair'
      }
    ],
    inventory: [
      {
        id: 'inv_thieves_tools',
        name: "Thieves' Tools (+3 Disarm)",
        type: 'quest',
        rarity: 'common',
        description: 'Picks, files, and tension wrenches for disarming traps.',
        quantity: 1
      },
      {
        id: 'inv_pot_rogue',
        name: 'Potion of Healing',
        type: 'consumable',
        rarity: 'common',
        description: 'Restores 2d4+4 HP upon use.',
        effect: 'heal_2d4_4',
        quantity: 1
      }
    ]
  },
  {
    id: 'hero_wizard',
    name: 'Master Elas',
    classType: 'wizard',
    hp: 20,
    maxHp: 20,
    ac: 13,
    speed: 6,
    initiative: 11,
    position: { x: 1, y: 4 },
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
    portrait: '🔮',
    color: '#8b5cf6', // violet
    weapons: [
      {
        id: 'w_staff',
        name: 'Oak Quarterstaff',
        range: 1,
        attackBonus: 3,
        damageDice: '1d6+1',
        damageType: 'bludgeoning',
        description: 'Runed catalyst staff for basic bludgeoning.'
      }
    ],
    abilities: [
      {
        id: 'ab_firebolt',
        name: 'Firebolt Cantrip',
        actionCost: 'action',
        cooldownTurns: 0,
        currentCooldown: 0,
        range: 5,
        damageDice: '1d10+1',
        description: 'Hurls a mote of arcane flame dealing 1d10+1 fire damage.',
        icon: 'Flame'
      },
      {
        id: 'ab_magic_missile',
        name: 'Magic Missile (Unmissable)',
        actionCost: 'action',
        cooldownTurns: 2,
        currentCooldown: 0,
        range: 6,
        damageDice: '3d4+3',
        description: 'Three glowing darts of force strike unerringly without rolling to hit.',
        icon: 'Zap'
      },
      {
        id: 'ab_burning_hands',
        name: 'Burning Hands (Blast)',
        actionCost: 'action',
        cooldownTurns: 2,
        currentCooldown: 0,
        range: 3,
        aoeRadius: 2,
        damageDice: '3d6',
        description: 'A cone of blazing fire engulfing all monsters in a 2-square radius (DC 13 DEX save).',
        icon: 'Sun'
      }
    ],
    inventory: [
      {
        id: 'inv_scroll_shield',
        name: 'Scroll of Arcane Shield',
        type: 'consumable',
        rarity: 'rare',
        description: 'Instantly adds +5 AC for 1 full round.',
        quantity: 1
      },
      {
        id: 'inv_pot_wizard',
        name: 'Potion of Healing',
        type: 'consumable',
        rarity: 'common',
        description: 'Restores 2d4+4 HP upon use.',
        effect: 'heal_2d4_4',
        quantity: 1
      }
    ]
  },
  {
    id: 'hero_cleric',
    name: 'Sister Brynn',
    classType: 'cleric',
    hp: 28,
    maxHp: 28,
    ac: 16,
    speed: 6,
    initiative: 10,
    position: { x: 2, y: 1 },
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
    portrait: '☀️',
    color: '#eab308', // amber/gold
    weapons: [
      {
        id: 'w_warhammer',
        name: 'Sanctified Warhammer',
        range: 1,
        attackBonus: 4,
        damageDice: '1d8+2',
        damageType: 'bludgeoning',
        description: 'Consecrated hammer blessed by the Sun Dawn.'
      }
    ],
    abilities: [
      {
        id: 'ab_cure_wounds',
        name: 'Cure Wounds',
        actionCost: 'action',
        cooldownTurns: 1,
        currentCooldown: 0,
        range: 3,
        healAmount: '2d8+3',
        description: 'Channels radiant divine energy restoring 2d8+3 HP to a chosen ally in range.',
        icon: 'Heart'
      },
      {
        id: 'ab_sacred_flame',
        name: 'Sacred Flame Cantrip',
        actionCost: 'action',
        cooldownTurns: 0,
        currentCooldown: 0,
        range: 5,
        damageDice: '1d8+1',
        description: 'Flame-like radiance descends on a foe (DC 13 DEX save or 1d8+1 radiant damage, ignores cover).',
        icon: 'SunDim'
      }
    ],
    inventory: [
      {
        id: 'inv_holy_water',
        name: 'Flask of Holy Water',
        type: 'consumable',
        rarity: 'common',
        description: 'Deals 2d6 Radiant damage when thrown at Undead.',
        quantity: 2
      },
      {
        id: 'inv_pot_cleric',
        name: 'Potion of Healing',
        type: 'consumable',
        rarity: 'common',
        description: 'Restores 2d4+4 HP upon use.',
        effect: 'heal_2d4_4',
        quantity: 1
      }
    ]
  }
];
