import { ShopItem } from '../types/schema';

export const TOWN_SHOP_ITEMS: ShopItem[] = [
  // --- WEAPONS ---
  {
    id: 'shop_flametongue',
    name: 'Flametongue Longsword',
    cost: 320,
    category: 'weapon',
    targetClass: 'fighter',
    rarity: 'rare',
    icon: 'Flame',
    description: 'Forged in dragonfire. Deals 1d8+3 slashing + 1d6 fire damage on hit.',
    weaponUpgrade: {
      id: 'w_flametongue',
      name: 'Flametongue Longsword',
      range: 1,
      attackBonus: 6,
      damageDice: '1d8+1d6+3',
      damageType: 'fire',
      description: 'Blazing blade sheathed in dancing tongues of flame.'
    }
  },
  {
    id: 'shop_shadow_bow',
    name: 'Shadow-Stalker Recurve',
    cost: 300,
    category: 'weapon',
    targetClass: 'rogue',
    rarity: 'rare',
    icon: 'Crosshair',
    description: 'Silent midnight yew bow with long reach (range 6). Deals 1d8+4 piercing.',
    weaponUpgrade: {
      id: 'w_shadow_bow',
      name: 'Shadow-Stalker Recurve',
      range: 6,
      attackBonus: 6,
      damageDice: '1d8+4',
      damageType: 'piercing',
      description: 'Fires whisper-quiet black-fletched arrows across vast halls.'
    }
  },
  {
    id: 'shop_arcane_staff',
    name: 'Staff of Arcane Storms',
    cost: 340,
    category: 'weapon',
    targetClass: 'wizard',
    rarity: 'rare',
    icon: 'Zap',
    description: 'Crackles with azure lightning. Ranged arc attack (range 4, 2d6 lightning damage).',
    weaponUpgrade: {
      id: 'w_staff_storms',
      name: 'Staff of Arcane Storms',
      range: 4,
      attackBonus: 5,
      damageDice: '2d6+2',
      damageType: 'force',
      description: 'Hurls crackling arcing lightning bolts at distant targets.'
    }
  },
  {
    id: 'shop_sun_morningstar',
    name: 'Sun-Forged Morningstar',
    cost: 310,
    category: 'weapon',
    targetClass: 'cleric',
    rarity: 'rare',
    icon: 'Sun',
    description: 'Consecrated dawn steel. Deals 1d10+3 radiant damage (lethal to undead).',
    weaponUpgrade: {
      id: 'w_sun_morningstar',
      name: 'Sun-Forged Morningstar',
      range: 1,
      attackBonus: 6,
      damageDice: '1d10+3',
      damageType: 'radiant',
      description: 'Glows with the searing light of the Dawnfather.'
    }
  },
  {
    id: 'shop_dagger_venom',
    name: 'Assassin Dagger of Venom',
    cost: 260,
    category: 'weapon',
    targetClass: 'rogue',
    rarity: 'rare',
    icon: 'Skull',
    description: 'Envenomed serpentine blade. Deals 1d4+4 piercing + 1d6 poison damage.',
    weaponUpgrade: {
      id: 'w_dagger_venom',
      name: 'Dagger of Venom',
      range: 1,
      attackBonus: 6,
      damageDice: '1d4+1d6+3',
      damageType: 'poison',
      description: 'Drips with dark lethal viper toxins.'
    }
  },

  // --- ARMOR & RELICS ---
  {
    id: 'shop_mithral_plate',
    name: 'Mithral Heavy Plate',
    cost: 380,
    category: 'armor',
    targetClass: 'fighter',
    rarity: 'epic',
    icon: 'Shield',
    description: 'Impenetrable yet featherlight elven mithral (+2 AC to recipient).',
    statBonus: {
      ac: 2
    }
  },
  {
    id: 'shop_elven_cloak',
    name: 'Elven Cloak of Shadows',
    cost: 290,
    category: 'armor',
    targetClass: 'rogue',
    rarity: 'rare',
    icon: 'Sparkles',
    description: 'Woven from twilight threads (+1 AC, +1 Movement Speed).',
    statBonus: {
      ac: 1,
      speed: 1
    }
  },
  {
    id: 'shop_archmagi_robes',
    name: 'Robes of the Spellweaver',
    cost: 320,
    category: 'armor',
    targetClass: 'wizard',
    rarity: 'epic',
    icon: 'Sparkles',
    description: 'Infused with abjuration wards (+2 AC to Wizard).',
    statBonus: {
      ac: 2
    }
  },
  {
    id: 'shop_amulet_vitality',
    name: 'Amulet of Pure Health',
    cost: 240,
    category: 'relic',
    targetClass: 'all',
    rarity: 'rare',
    icon: 'Heart',
    description: 'Pulsing ruby amulet (+8 Maximum Hit Points to equipped hero).',
    statBonus: {
      maxHp: 8
    }
  },
  {
    id: 'shop_ring_protection',
    name: 'Ring of Protection',
    cost: 220,
    category: 'relic',
    targetClass: 'all',
    rarity: 'rare',
    icon: 'Shield',
    description: 'Shimmering ring of force (+1 Armor Class to any hero).',
    statBonus: {
      ac: 1
    }
  },
  {
    id: 'shop_boots_speed',
    name: 'Boots of the Windrunner',
    cost: 190,
    category: 'relic',
    targetClass: 'all',
    rarity: 'common',
    icon: 'Footprints',
    description: 'Feather-enchanted courier boots (+1 Movement Speed square).',
    statBonus: {
      speed: 1
    }
  },

  // --- CONSUMABLES ---
  {
    id: 'shop_pot_greater',
    name: 'Potion of Greater Healing',
    cost: 75,
    category: 'consumable',
    targetClass: 'all',
    rarity: 'rare',
    icon: 'Heart',
    description: 'Concentrated restorative elixir. Restores 4d4+4 Hit Points on use.',
    consumableItem: {
      id: 'pot_greater_shop',
      name: 'Potion of Greater Healing',
      type: 'consumable',
      rarity: 'rare',
      description: 'Restores 4d4+4 Hit Points when quaffed as an interact action.',
      effect: 'heal_4d4_4',
      quantity: 1
    }
  },
  {
    id: 'shop_scroll_revive',
    name: 'Scroll of Revivify',
    cost: 180,
    category: 'consumable',
    targetClass: 'cleric',
    rarity: 'epic',
    icon: 'Sparkles',
    description: 'Golden celestial parchment. Instantly restores a fallen ally to 12 HP.',
    consumableItem: {
      id: 'scroll_revive_shop',
      name: 'Scroll of Revivify',
      type: 'consumable',
      rarity: 'epic',
      description: 'Channels divine resurrection to bring a fallen hero back to life with 12 HP.',
      quantity: 1
    }
  },
  {
    id: 'shop_elixir_haste',
    name: 'Elixir of Swift Haste',
    cost: 60,
    category: 'consumable',
    targetClass: 'all',
    rarity: 'common',
    icon: 'Zap',
    description: 'Quaff as interact to immediately restore full movement this turn.',
    consumableItem: {
      id: 'elixir_haste_shop',
      name: 'Elixir of Swift Haste',
      type: 'consumable',
      rarity: 'common',
      description: 'Instantly grants +6 movement squares upon use.',
      quantity: 1
    }
  },
  {
    id: 'shop_alchemist_fire',
    name: "Alchemist's Fire Flask",
    cost: 70,
    category: 'consumable',
    targetClass: 'all',
    rarity: 'common',
    icon: 'Flame',
    description: 'Volatile glass sphere. Hurls at enemies to scorch for 3d6 fire damage.',
    consumableItem: {
      id: 'bomb_alchemist_shop',
      name: "Alchemist's Fire Flask",
      type: 'consumable',
      rarity: 'common',
      description: 'Hurled projectile dealing 3d6 fire damage to a target.',
      quantity: 1
    }
  },
  {
    id: 'shop_draught_vigor',
    name: 'Crimson Draught of Vigor',
    cost: 85,
    category: 'consumable',
    targetClass: 'all',
    rarity: 'rare',
    icon: 'Heart',
    description: 'Restores 15 Hit Points and purges debilitating conditions on use.',
    consumableItem: {
      id: 'draught_vigor_shop',
      name: 'Crimson Draught of Vigor',
      type: 'consumable',
      rarity: 'rare',
      description: 'Restores 15 HP immediately when imbibed.',
      effect: 'heal_15',
      quantity: 1
    }
  },

  // --- PERMANENT UPGRADES (PERSIST ACROSS RUNS & RETAINED ON DEATH) ---
  {
    id: 'shop_perm_blood_plating',
    name: 'Blood-Tempered Plating',
    cost: 220,
    category: 'permanent_upgrade',
    permanentUpgradeId: 'perm_blood_plating',
    targetClass: 'all',
    rarity: 'epic',
    icon: 'Shield',
    description: 'Heavy crimson alloy infused with warding blood-runes. Permanently grants +2 AC to heroes across all current and future runs. Retained on death.',
    permanentUpgradeEffect: '+2 Armor Class (Permanent across all runs)',
    statBonus: {
      ac: 2
    }
  },
  {
    id: 'shop_perm_ancient_vitality',
    name: 'Ancient Vitality Sigil',
    cost: 200,
    category: 'permanent_upgrade',
    permanentUpgradeId: 'perm_ancient_vitality',
    targetClass: 'all',
    rarity: 'epic',
    icon: 'Heart',
    description: 'Imbued with the undying life-essence of ancient wardens. Permanently grants +10 Max HP across all runs. Retained on death.',
    permanentUpgradeEffect: '+10 Maximum Hit Points (Permanent across all runs)',
    statBonus: {
      maxHp: 10
    }
  },
  {
    id: 'shop_perm_fleetfoot_boon',
    name: 'Fleetfoot Instinct',
    cost: 175,
    category: 'permanent_upgrade',
    permanentUpgradeId: 'perm_fleetfoot_boon',
    targetClass: 'all',
    rarity: 'rare',
    icon: 'Footprints',
    description: 'Uncanny stride honed on treacherous trails. Permanently grants +1 Movement Speed across all runs. Retained on death.',
    permanentUpgradeEffect: '+1 Movement Speed (Permanent across all runs)',
    statBonus: {
      speed: 1
    }
  },
  {
    id: 'shop_perm_battle_focus',
    name: 'Crimson Battle-Focus',
    cost: 240,
    category: 'permanent_upgrade',
    permanentUpgradeId: 'perm_battle_focus',
    targetClass: 'all',
    rarity: 'epic',
    icon: 'Crosshair',
    description: 'Relentless combat discipline. Permanently grants +1 to all weapon attack hit rolls across all runs. Retained on death.',
    permanentUpgradeEffect: '+1 Weapon Attack Hit Bonus (Permanent across all runs)',
    statBonus: {
      attackBonus: 1
    }
  },
  {
    id: 'shop_perm_debt_rebate',
    name: 'Debt-Rebate Ward',
    cost: 260,
    category: 'permanent_upgrade',
    permanentUpgradeId: 'perm_debt_rebate',
    targetClass: 'all',
    rarity: 'legendary',
    icon: 'Coins',
    description: 'Arcane banking ward safeguarding wealth against the abyss. Reduces gold lost upon death from 50% down to 25%. Retained on death.',
    permanentUpgradeEffect: 'Halves death gold penalty (Retain 75% gold instead of 50%)'
  },

  // --- NARRATIVE ITEMS (NO COMBAT STATS, UNLOCKS TEXT & ENDINGS, RETAINED ON DEATH) ---
  {
    id: 'shop_memory_locket_ruins',
    name: 'Faded Locket of the Ashen Ruins',
    cost: 90,
    category: 'memory_item',
    memoryItemId: 'memory_locket_ruins',
    targetClass: 'all',
    rarity: 'rare',
    icon: 'Sparkles',
    description: 'Narrative Memory Item (No combat balance changes). A tarnished brass medallion with a child\'s likeness. Unlocks the hidden Act I Survivors Epilogue.',
    narrativeUnlockSnippet: 'When you returned to the crossroads, the surviving family wept with relief, gifting you their ancestor\'s secret blessing and a safe passage through the hills.',
    unlockedEndingTitle: 'Act I Revelation: Gratitude of the Displaced'
  },
  {
    id: 'shop_memory_bandit_ledger',
    name: "Bandit Leader's Cipher Ledger",
    cost: 110,
    category: 'memory_item',
    memoryItemId: 'memory_bandit_ledger',
    targetClass: 'all',
    rarity: 'rare',
    icon: 'FileText',
    description: 'Narrative Memory Item (No combat balance changes). A coded journal detailing covert bribes by the merchant guild. Unlocks hidden negotiation dialogue in Act II.',
    narrativeUnlockSnippet: 'Decoding the blotched ink reveals Malakar was never a mere cutthroat—he was hunting the same syndicate who destroyed your homeland.',
    unlockedEndingTitle: 'Act II Revelation: The Trail of Dirty Gold'
  },
  {
    id: 'shop_memory_arbiter_seal',
    name: 'Seal of the High Arbiter',
    cost: 140,
    category: 'memory_item',
    memoryItemId: 'memory_arbiter_seal',
    targetClass: 'all',
    rarity: 'legendary',
    icon: 'Sun',
    description: 'Narrative Memory Item (No combat balance changes). Wax seal bearing the sigil of the ancient Crimson Court. Unlocks the true "Debt Absolved" ending in Act III.',
    narrativeUnlockSnippet: 'Holding the high magistrate\'s seal high, the courtroom guards lower their halberds. The Arbiter bows: "The debt is canceled by ancient right. You are free."',
    unlockedEndingTitle: 'Act III Secret Ending: Debt Absolved & Legacy Restored'
  },
  {
    id: 'shop_memory_tear_fallen',
    name: 'Crystalline Tear of the Fallen',
    cost: 95,
    category: 'memory_item',
    memoryItemId: 'memory_tear_fallen',
    targetClass: 'all',
    rarity: 'rare',
    icon: 'Heart',
    description: 'Narrative Memory Item (No combat balance changes). A sorrowful gem that whispers cold mist. Unlocks the solemn Chronicle of the Forgotten Souls.',
    narrativeUnlockSnippet: 'A haunting melody whispers from the tear, preserving the names of the lost. The spirits grant you silent passage, remembering your compassion.',
    unlockedEndingTitle: 'Chronicle Lore: Eulogy of the Forsaken'
  },

  // --- SPECIAL CONQUEST REWARD ---
  {
    id: 'shop_robe_conquest_red',
    name: 'Robe of Conquest-Red',
    cost: 0,
    voucherCostId: 'voucher_robe_of_conquest_red',
    category: 'armor',
    targetClass: 'all',
    rarity: 'legendary',
    icon: 'Flame',
    description: 'Consecrated crimson vestment of the Solo Crucible. Effect: All damage dealt +10%, rounded down to nearest whole number. Requires [Voucher: Robe of Conquest-Red] earned by surviving the Solo Crucible!',
    consumableItem: {
      id: 'robe_of_conquest_red',
      name: 'Robe of Conquest-Red',
      type: 'armor',
      rarity: 'legendary',
      description: 'All damage dealt +10%, rounded down to nearest whole number.',
      effect: 'damage_multiplier_1_10',
      quantity: 1
    }
  }
];
