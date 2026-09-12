/**
 * Formal JSON Schema for the DM-Free D&D Applet Game Engine.
 * Follows JSON Schema Draft-07 / 2020-12 standards.
 * Can be exported, copied, or validated against any compatible JSON validator.
 */

export const DMFREE_DD_ENGINE_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://tabletop-engine.dnd/schemas/dm-free-engine.json",
  "title": "DM-Free D&D Applet Game Engine Schema",
  "description": "Comprehensive specification for a grid-based, turn-based, fully cooperative Virtual Tabletop engine with deterministic algorithmic monster AI, procedural edge-spawning map expansion, environmental hazards, traps, and tiered module expansions.",
  "type": "object",
  "required": [
    "engine_version",
    "grid_system",
    "character_turn_definition",
    "exploration_trigger_definition",
    "monster_ai_definition",
    "hazard_and_trap_definition",
    "boss_encounter_definition",
    "room_data_block_definition",
    "module_expansion_definition"
  ],
  "properties": {
    "engine_version": {
      "type": "string",
      "enum": ["1.0.0", "1.1.0", "2.0.0"],
      "description": "Semantic engine version."
    },
    "grid_system": {
      "type": "object",
      "required": ["unit_measurement", "diagonal_rule", "coordinate_system"],
      "properties": {
        "unit_measurement": {
          "type": "string",
          "default": "5ft_per_square",
          "description": "Scale of 1 grid cell in game space."
        },
        "diagonal_rule": {
          "type": "string",
          "enum": ["5_10_5", "euclidean", "chebyshev_standard"],
          "description": "Rule for calculating diagonal movement cost and range."
        },
        "coordinate_system": {
          "type": "string",
          "enum": ["cartesian_2d_xy"],
          "description": "Grid indexing format where (0,0) is dungeon origin."
        }
      }
    },
    "character_turn_definition": {
      "type": "object",
      "description": "Cooperative Hero Turn parameters granting discrete resource pools per turn cycle.",
      "required": ["move", "attack", "interact", "bonus_action"],
      "properties": {
        "move": {
          "type": "object",
          "required": ["base_speed_squares", "remaining_speed", "dash_multiplier"],
          "properties": {
            "base_speed_squares": {
              "type": "integer",
              "minimum": 1,
              "maximum": 12,
              "description": "Base movement allotment per turn (e.g., 6 squares = 30ft)."
            },
            "remaining_speed": {
              "type": "integer",
              "minimum": 0,
              "description": "Squares of movement remaining in current turn."
            },
            "dash_multiplier": {
              "type": "number",
              "default": 2.0,
              "description": "Multiplier applied when spending an Action to Dash."
            }
          }
        },
        "attack": {
          "type": "object",
          "required": ["actions_per_turn", "weapon_profiles"],
          "properties": {
            "actions_per_turn": {
              "type": "integer",
              "default": 1,
              "description": "Standard action pool dedicated to Attacks or Spells."
            },
            "weapon_profiles": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "range_squares", "attack_bonus", "damage_dice", "damage_type"],
                "properties": {
                  "name": { "type": "string" },
                  "range_squares": { "type": "integer", "minimum": 1 },
                  "attack_bonus": { "type": "integer" },
                  "damage_dice": { "type": "string", "pattern": "^[0-9]+d[0-9]+(\\+[0-9]+)?$" },
                  "damage_type": {
                    "type": "string",
                    "enum": ["slashing", "piercing", "bludgeoning", "fire", "radiant", "necrotic"]
                  }
                }
              }
            }
          }
        },
        "interact": {
          "type": "object",
          "required": ["free_object_interaction", "supported_interactions"],
          "properties": {
            "free_object_interaction": { "type": "boolean", "default": true },
            "supported_interactions": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "open_door",
                  "open_chest",
                  "disarm_trap",
                  "investigate_edge",
                  "deactivate_boss_pillar",
                  "consume_potion"
                ]
              }
            }
          }
        },
        "bonus_action": {
          "type": "object",
          "required": ["available", "abilities"],
          "properties": {
            "available": { "type": "boolean" },
            "abilities": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    },
    "exploration_trigger_definition": {
      "type": "object",
      "description": "Autonomous map exposure rule. Heroes occupying Edge Coordinates or opening boundary thresholds dynamically initialize new room data blocks.",
      "required": ["spawning_map_rule", "trigger_conditions", "edge_coordinate_schema"],
      "properties": {
        "spawning_map_rule": {
          "type": "string",
          "const": "Every time a hero occupies an 'Edge Coordinate', a new, room data block initializes.",
          "description": "Governing law of dynamic dungeon generation."
        },
        "trigger_conditions": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "hero_occupies_edge_coordinate",
              "hero_interacts_with_doorway",
              "line_of_sight_threshold_crossed"
            ]
          }
        },
        "edge_coordinate_schema": {
          "type": "object",
          "required": ["coordinate", "connects_to_direction", "room_spawn_seed"],
          "properties": {
            "coordinate": {
              "type": "object",
              "required": ["x", "y"],
              "properties": {
                "x": { "type": "integer" },
                "y": { "type": "integer" }
              }
            },
            "connects_to_direction": {
              "type": "string",
              "enum": ["north", "south", "east", "west"]
            },
            "target_room_index": { "type": "integer" },
            "spawn_status": {
              "type": "string",
              "enum": ["pending", "spawned", "sealed"]
            }
          }
        }
      }
    },
    "monster_ai_definition": {
      "type": "object",
      "description": "Deterministic, DM-free monster decision engine. Evaluates targeting priorities and state machines without human intervention.",
      "required": ["behavior_archetypes", "targeting_priority_engine", "action_execution_pipeline"],
      "properties": {
        "behavior_archetypes": {
          "type": "object",
          "required": ["chase", "ambush", "patrol"],
          "properties": {
            "chase": {
              "type": "object",
              "description": "Relentlessly moves toward target. Used by Skeletons and Berserkers.",
              "properties": {
                "targeting_rule": { "type": "string", "enum": ["lowest_hp", "nearest"] },
                "movement_intent": { "type": "string", "const": "minimize_manhattan_distance" },
                "attack_threshold": { "type": "integer", "description": "Adjacent (1) or reach" }
              }
            },
            "ambush": {
              "type": "object",
              "description": "Remains hidden/camouflaged until heroes step within trigger radius. Strikes with surprise then repositions. Used by Goblins and Spiders.",
              "properties": {
                "stealth_dc": { "type": "integer", "default": 13 },
                "activation_distance": { "type": "integer", "description": "Squares to hero before springing trap" },
                "hit_and_run_retreat_squares": { "type": "integer", "default": 2 }
              }
            },
            "patrol": {
              "type": "object",
              "description": "Follows a defined waypoint loop until hero enters detection radius, then transitions to Chase.",
              "properties": {
                "waypoints": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": { "x": { "type": "integer" }, "y": { "type": "integer" } }
                  }
                },
                "detection_radius_squares": { "type": "integer", "default": 4 }
              }
            }
          }
        },
        "targeting_priority_engine": {
          "type": "object",
          "properties": {
            "evaluation_order": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "targeting players with lowest hp",
                  "targeting nearest player",
                  "targeting isolated players (no allies within 2 squares)",
                  "targeting player with highest threat score"
                ]
              }
            }
          }
        },
        "action_execution_pipeline": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["condition", "action", "parameters"],
            "properties": {
              "condition": {
                "type": "string",
                "enum": ["in_attack_range", "out_of_range", "hp_below_half", "first_turn_surprise"]
              },
              "action": {
                "type": "string",
                "enum": ["Move", "Attack", "Retreat", "CastSpell", "WebTrap", "CallReinforcements"]
              },
              "parameters": {
                "type": "object",
                "properties": {
                  "move_squares": { "type": "integer" },
                  "attack_range": { "type": "integer" },
                  "damage_dice": { "type": "string" },
                  "saving_throw_dc": { "type": "integer" }
                }
              }
            }
          }
        }
      }
    },
    "hazard_and_trap_definition": {
      "type": "object",
      "required": ["environmental_hazards", "coordinate_traps"],
      "properties": {
        "environmental_hazards": {
          "type": "object",
          "description": "Persistent spatial hazards affecting the battlefield.",
          "properties": {
            "crumbling_floor": {
              "type": "object",
              "properties": {
                "integrity_steps": { "type": "integer", "default": 2 },
                "failure_effect": { "type": "string", "default": "Collapses into a 10ft spiked pit" },
                "damage_on_collapse": { "type": "string", "default": "1d6 bludgeoning + difficult terrain" },
                "saving_throw": { "type": "string", "default": "DC 12 DEX save to leap to adjacent safe square" }
              }
            }
          }
        },
        "coordinate_traps": {
          "type": "object",
          "description": "Tile-coordinate triggered traps.",
          "properties": {
            "spike_trap": {
              "type": "object",
              "properties": {
                "trigger_type": { "type": "string", "const": "land_on_coordinate" },
                "perception_dc": { "type": "integer", "default": 12 },
                "disarm_dc": { "type": "integer", "default": 13 },
                "effect": { "type": "string", "default": "DC 13 DEX save or take 2d6 piercing damage" }
              }
            }
          }
        }
      }
    },
    "boss_encounter_definition": {
      "type": "object",
      "required": ["boss_name", "distinct_combat_mechanic", "phases"],
      "properties": {
        "boss_name": { "type": "string" },
        "distinct_combat_mechanic": {
          "type": "string",
          "description": "Unique environmental or interactive puzzle element required during the boss encounter."
        },
        "phases": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["phase_number", "hp_trigger_pct", "mechanic_effect"],
            "properties": {
              "phase_number": { "type": "integer" },
              "hp_trigger_pct": { "type": "integer" },
              "mechanic_effect": { "type": "string" }
            }
          }
        }
      }
    },
    "room_data_block_definition": {
      "type": "object",
      "description": "Standard atomic building block for procedural dungeon layouts.",
      "required": ["id", "dimensions", "tiles", "edge_coordinates", "threat_entities"],
      "properties": {
        "id": { "type": "string" },
        "dimensions": {
          "type": "object",
          "required": ["width", "height"],
          "properties": {
            "width": { "type": "integer" },
            "height": { "type": "integer" }
          }
        },
        "tiles": { "type": "array" },
        "edge_coordinates": { "type": "array" },
        "threat_entities": { "type": "array" }
      }
    },
    "module_expansion_definition": {
      "type": "object",
      "description": "Tiered campaign content packages enabling core, advanced, and epic progression.",
      "required": ["module_1_core", "module_2_advanced", "module_3_epic"],
      "properties": {
        "module_1_core": { "type": "object" },
        "module_2_advanced": { "type": "object" },
        "module_3_epic": { "type": "object" }
      }
    }
  }
} as const;
