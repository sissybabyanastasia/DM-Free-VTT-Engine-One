import { 
  MonsterInstance, 
  HeroCharacter, 
  GridCoordinate, 
  CombatLogEntry, 
  GridTile,
  HazardInstance,
  BossEncounterData
} from '../types/schema';
import { rollAttack, rollDice } from './dice';

export function distance(a: GridCoordinate, b: GridCoordinate): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); // Chebyshev (standard D&D 5e grid distance)
}

export function manhattanDistance(a: GridCoordinate, b: GridCoordinate): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function selectTarget(
  monster: MonsterInstance,
  heroes: HeroCharacter[]
): HeroCharacter | null {
  const livingHeroes = heroes.filter(h => h.hp > 0);
  if (livingHeroes.length === 0) return null;

  const rule = monster.ai.targetingRule;
  const preferredRange = monster.ai.preferredRange || 1;

  // Frontline Tactical Engagement:
  // If living heroes are already within attack reach (e.g. adjacent frontline tank),
  // prioritize enemies engaged in melee combat before chasing distant backline heroes
  const engagedHeroes = livingHeroes.filter(h => distance(monster.position, h.position) <= preferredRange);
  const candidatePool = engagedHeroes.length > 0 ? engagedHeroes : livingHeroes;

  if (rule === 'lowest_hp') {
    // Pick hero with lowest HP within candidate pool
    return [...candidatePool].sort((a, b) => a.hp - b.hp)[0];
  }

  if (rule === 'isolated') {
    // Hero with fewest allies within 2 squares
    const isolationScores = candidatePool.map(hero => {
      const alliesNear = livingHeroes.filter(other => other.id !== hero.id && distance(hero.position, other.position) <= 2).length;
      return { hero, score: alliesNear };
    });
    isolationScores.sort((a, b) => a.score - b.score);
    return isolationScores[0].hero;
  }

  if (rule === 'highest_threat') {
    return [...candidatePool].sort((a, b) => b.maxHp - a.maxHp)[0];
  }

  // Default 'nearest'
  return [...candidatePool].sort((a, b) => {
    const distA = distance(monster.position, a.position);
    const distB = distance(monster.position, b.position);
    return distA - distB;
  })[0];
}

export interface MonsterTurnResult {
  updatedMonster: MonsterInstance;
  updatedHeroes: HeroCharacter[];
  updatedHazards: HazardInstance[];
  logs: CombatLogEntry[];
}

/**
 * Execute a single monster's algorithmic turn based on its AI configuration.
 */
export function executeMonsterTurn(
  monster: MonsterInstance,
  heroes: HeroCharacter[],
  allTiles: Map<string, GridTile>,
  hazards: HazardInstance[],
  bossEncounter?: BossEncounterData
): MonsterTurnResult {
  if (!monster.isAlive || monster.hp <= 0) {
    return {
      updatedMonster: monster,
      updatedHeroes: heroes,
      updatedHazards: hazards,
      logs: []
    };
  }

  const logs: CombatLogEntry[] = [];
  let currentPos = { ...monster.position };
  let currentHeroes = heroes.map(h => ({ ...h }));
  let currentHazards = [...hazards];
  const ai = { ...monster.ai };

  // 1. Check Target
  const target = selectTarget(monster, currentHeroes);
  if (!target) {
    return {
      updatedMonster: monster,
      updatedHeroes: currentHeroes,
      updatedHazards: currentHazards,
      logs
    };
  }

  const distToTarget = distance(currentPos, target.position);

  // 2. Behavioral State Transitions
  // PATROL -> CHASE transition if player within 4 squares
  if (ai.behaviorType === 'patrol') {
    if (distToTarget <= 4) {
      ai.behaviorType = 'chase';
      logs.push({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: monster.name,
        action: 'Alert Triggered',
        detail: `Alert! ${monster.name} spotted ${target.name} within 4 squares. Breaks patrol and switches to CHASE targeting lowest HP!`,
        type: 'system'
      });
    } else if (ai.patrolWaypoints && ai.patrolWaypoints.length > 0) {
      // Step along patrol route
      const wpIdx = ai.currentPatrolIndex || 0;
      const targetWp = ai.patrolWaypoints[wpIdx];
      
      // Move 1 step towards waypoint
      const nextStep = getStepTowards(currentPos, targetWp, allTiles, currentHeroes, [monster]);
      currentPos = nextStep;
      if (currentPos.x === targetWp.x && currentPos.y === targetWp.y) {
        ai.currentPatrolIndex = (wpIdx + 1) % ai.patrolWaypoints.length;
      }
      logs.push({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: monster.name,
        action: 'Patrol March',
        detail: `${monster.name} paces along patrol route towards (${targetWp.x}, ${targetWp.y}).`,
        type: 'move'
      });
    }
  }

  // AMBUSH logic (e.g. Spider / Goblin)
  if (ai.behaviorType === 'ambush' && ai.ambushConfig?.isStealthed) {
    if (distToTarget <= ai.ambushConfig.revealRange) {
      // Reveal ambush!
      ai.ambushConfig.isStealthed = false;
      logs.push({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: monster.name,
        action: 'Ambush Sprung!',
        detail: `SURPRISE! ${monster.name} reveals itself from hiding, leaping at ${target.name}!`,
        type: 'boss'
      });
    }
  }

  // 3. Movement execution (if out of attack range)
  const preferredRange = ai.preferredRange || 1;
  const inRange = distToTarget <= preferredRange;

  if (!inRange && ai.behaviorType !== 'patrol') {
    // Calculate path towards target
    const maxSteps = Math.min(monster.speed, 5);
    for (let step = 0; step < maxSteps; step++) {
      const currentDist = distance(currentPos, target.position);
      if (currentDist <= preferredRange) break;

      const next = getStepTowards(currentPos, target.position, allTiles, currentHeroes, [monster]);
      if (next.x === currentPos.x && next.y === currentPos.y) {
        break; // Blocked
      }
      currentPos = next;
    }

    logs.push({
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: monster.name,
      action: 'Algorithmic Move',
      detail: `${monster.name} advances to (${currentPos.x}, ${currentPos.y}) pursuing ${target.name}.`,
      type: 'move'
    });
  }

  // 4. Attack execution
  const finalDist = distance(currentPos, target.position);
  if (finalDist <= preferredRange) {
    const attack = monster.attacks[0] || {
      name: 'Claw Strike',
      attackBonus: 4,
      damageDice: '1d6+2',
      damageType: 'slashing'
    };

    const atkRoll = rollAttack(attack.attackBonus, target.ac);
    
    if (atkRoll.isHit) {
      const dmg = rollDice(attack.damageDice);
      const isCrit = atkRoll.isCrit;
      const totalDamage = isCrit ? dmg.total * 2 : dmg.total;

      // Apply damage to target
      currentHeroes = currentHeroes.map(h => {
        if (h.id === target.id) {
          const newHp = Math.max(0, h.hp - totalDamage);
          return { ...h, hp: newHp };
        }
        return h;
      });

      logs.push({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: monster.name,
        action: `Attack (${attack.name})`,
        detail: `🎲 Rolled ${atkRoll.d20} + ${atkRoll.modifier} = ${atkRoll.total} vs AC ${target.ac} (${isCrit ? 'CRITICAL HIT!' : 'HIT!'}) dealing ${totalDamage} ${attack.damageType} damage to ${target.name}!`,
        roll: atkRoll,
        damage: { amount: totalDamage, type: attack.damageType },
        type: 'damage'
      });

      // Ambush Hit & Run retreat (e.g. Goblins)
      if (ai.ambushConfig?.retreatAfterAttackSquares && ai.ambushConfig.retreatAfterAttackSquares > 0) {
        const retreatSteps = ai.ambushConfig.retreatAfterAttackSquares;
        for (let s = 0; s < retreatSteps; s++) {
          const retreatPos = getStepAwayFrom(currentPos, target.position, allTiles, currentHeroes);
          currentPos = retreatPos;
        }
        logs.push({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          source: monster.name,
          action: 'Nimble Escape',
          detail: `${monster.name} darts backward to (${currentPos.x}, ${currentPos.y}) using Hit & Run tactics!`,
          type: 'move'
        });
      }
    } else {
      logs.push({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: monster.name,
        action: `Attack (${attack.name})`,
        detail: `🎲 Rolled ${atkRoll.d20} + ${atkRoll.modifier} = ${atkRoll.total} vs AC ${target.ac} (Miss!) ${target.name} deflects the blow.`,
        roll: atkRoll,
        type: 'attack'
      });
    }
  }

  // Boss Phase Check
  if (monster.isBoss && bossEncounter) {
    // Check if pillars still active for Malakor
    if (bossEncounter.pillarsToDeactivate) {
      const activePillars = bossEncounter.pillarsToDeactivate.filter(p => !p.isDeactivated).length;
      if (activePillars > 0) {
        // Shielded
        logs.push({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          source: monster.name,
          action: 'Bone Shield Hum',
          detail: `The Bone Shield crackles with unholy light! (${activePillars} Crypt Pillars remain active)`,
          type: 'boss'
        });
      }
    }
  }

  const updatedMonster: MonsterInstance = {
    ...monster,
    position: currentPos,
    ai
  };

  return {
    updatedMonster,
    updatedHeroes: currentHeroes,
    updatedHazards: currentHazards,
    logs
  };
}

/**
 * Pathfinding helper: selects best valid step towards target coordinate
 */
function getStepTowards(
  from: GridCoordinate,
  to: GridCoordinate,
  allTiles: Map<string, GridTile>,
  heroes: HeroCharacter[],
  monsters: MonsterInstance[]
): GridCoordinate {
  const heroOccupied = new Set(heroes.filter(h => h.hp > 0).map(h => `${h.position.x},${h.position.y}`));
  const monsterOccupied = new Set(monsters.filter(m => m.isAlive && !(m.position.x === from.x && m.position.y === from.y)).map(m => `${m.position.x},${m.position.y}`));

  const allDirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: -1 }
  ];

  const currentDist = distance(from, to);

  // Sort neighbors by distance to target (closest first)
  const sorted = allDirs
    .map(d => ({ x: from.x + d.dx, y: from.y + d.dy }))
    .filter(c => distance(c, to) < currentDist)
    .sort((a, b) => distance(a, to) - distance(b, to));

  for (const c of sorted) {
    const key = `${c.x},${c.y}`;
    const tile = allTiles.get(key);
    if (tile && tile.walkable && !heroOccupied.has(key) && !monsterOccupied.has(key)) {
      return c;
    }
  }

  return from; // Stay if blocked
}

/**
 * Retreat step: moves away from threat
 */
function getStepAwayFrom(
  from: GridCoordinate,
  threat: GridCoordinate,
  allTiles: Map<string, GridTile>,
  heroes: HeroCharacter[]
): GridCoordinate {
  const heroOccupied = new Set(heroes.filter(h => h.hp > 0).map(h => `${h.position.x},${h.position.y}`));

  const allDirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: -1 }
  ];

  const currentDist = distance(from, threat);

  // Sort neighbors by distance to threat (furthest first)
  const sorted = allDirs
    .map(d => ({ x: from.x + d.dx, y: from.y + d.dy }))
    .filter(c => distance(c, threat) > currentDist)
    .sort((a, b) => distance(b, threat) - distance(a, threat));

  for (const c of sorted) {
    const key = `${c.x},${c.y}`;
    const tile = allTiles.get(key);
    if (tile && tile.walkable && !heroOccupied.has(key)) {
      return c;
    }
  }

  return from;
}
