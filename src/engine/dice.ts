/**
 * Deterministic & standard D&D dice mechanics and rolling utilities.
 */

export interface DiceResult {
  dice: string;
  rolls: number[];
  modifier: number;
  total: number;
}

export function rollDice(expression: string): DiceResult {
  // Support format: XdY or XdY+Z or XdY-Z
  const match = expression.trim().match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/i);
  if (!match) {
    const staticNum = parseInt(expression, 10);
    return {
      dice: expression,
      rolls: isNaN(staticNum) ? [0] : [staticNum],
      modifier: 0,
      total: isNaN(staticNum) ? 0 : staticNum
    };
  }

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const sign = match[3] === '-' ? -1 : 1;
  const modValue = match[4] ? parseInt(match[4], 10) * sign : 0;

  const rolls: number[] = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const val = Math.floor(Math.random() * sides) + 1;
    rolls.push(val);
    sum += val;
  }

  return {
    dice: expression,
    rolls,
    modifier: modValue,
    total: Math.max(0, sum + modValue)
  };
}

export interface AttackRollResult {
  d20: number;
  modifier: number;
  total: number;
  targetAC: number;
  isHit: boolean;
  isCrit: boolean;
  isCritFail: boolean;
}

export function rollAttack(modifier: number, targetAC: number): AttackRollResult {
  const d20 = Math.floor(Math.random() * 20) + 1;
  const isCrit = d20 === 20;
  const isCritFail = d20 === 1;
  const total = d20 + modifier;
  const isHit = isCrit || (!isCritFail && total >= targetAC);

  return {
    d20,
    modifier,
    total,
    targetAC,
    isHit,
    isCrit,
    isCritFail
  };
}

export interface SavingThrowResult {
  d20: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
}

export function rollSavingThrow(modifier: number, dc: number): SavingThrowResult {
  const d20 = Math.floor(Math.random() * 20) + 1;
  const total = d20 + modifier;
  return {
    d20,
    modifier,
    total,
    dc,
    success: total >= dc
  };
}
