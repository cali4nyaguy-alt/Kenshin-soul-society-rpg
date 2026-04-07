import {
  ClassType,
  RollOutcome,
  EscapeOutcome,
  RespectTier,
  LeadershipTier,
  PlayerStats,
} from './types';
import {
  CLASS_ADVANTAGE,
  CLASS_DISADVANTAGE,
  ADVANTAGE_BONUS,
  DISADVANTAGE_PENALTY,
  ROLL_FAIL_MAX,
  ROLL_MIXED_MAX,
  ESCAPE_PERFECT_MIN,
  ESCAPE_PARTIAL_MIN,
  LEADERSHIP_STRANGER_MAX,
  LEADERSHIP_STRATEGIST_MAX,
  RESPECT_BLOOD_BROTHERS_MIN,
  RESPECT_PROFESSIONAL_MIN,
  RESPECT_DICK_MIN,
  RESPECT_HOSTILE_MIN,
  ABANDON_PENALTY_MIN,
  ABANDON_PENALTY_MAX,
  TACTICAL_RETREAT_HP_THRESHOLD,
  HITEN_GAIN_PER_STRIKE,
  HITEN_MAX_BARS,
} from './constants';

// ─── D5 × 4 Roll ────────────────────────────────────────────────────
/** Roll four D5 dice and return their sum (range 4–20). */
export function rollD5x4(): number {
  let total = 0;
  for (let i = 0; i < 4; i++) {
    total += Math.floor(Math.random() * 5) + 1;
  }
  return total;
}

// ─── Class Modifier ──────────────────────────────────────────────────
/** Returns +4, -4, or 0 depending on attacker vs defender class. */
export function classModifier(attacker: ClassType, defender: ClassType): number {
  if (CLASS_ADVANTAGE[attacker] === defender) return ADVANTAGE_BONUS;
  if (CLASS_DISADVANTAGE[attacker] === defender) return DISADVANTAGE_PENALTY;
  return 0;
}

// ─── Total Roll ──────────────────────────────────────────────────────
export interface RollResult {
  dice: number;
  stat: number;
  classBonus: number;
  empoweredBonus: number;
  total: number;
  outcome: RollOutcome;
}

export function performRoll(
  stat: number,
  attackerClass: ClassType,
  defenderClass: ClassType,
  empoweredBonus: number = 0,
): RollResult {
  const dice = rollD5x4();
  const classBonus = classModifier(attackerClass, defenderClass);
  const total = dice + stat + classBonus + empoweredBonus;
  const outcome = resolveOutcome(total);
  return { dice, stat, classBonus, empoweredBonus, total, outcome };
}

// ─── Outcome Resolution ──────────────────────────────────────────────
export function resolveOutcome(total: number): RollOutcome {
  if (total <= ROLL_FAIL_MAX) return 'fail';
  if (total <= ROLL_MIXED_MAX) return 'mixed';
  return 'perfect';
}

// ─── Escape Roll ─────────────────────────────────────────────────────
export interface EscapeResult {
  dice: number;
  cha: number;
  total: number;
  outcome: EscapeOutcome;
}

export function performEscapeRoll(cha: number): EscapeResult {
  const dice = rollD5x4();
  const total = dice + cha;
  let outcome: EscapeOutcome;
  if (total >= ESCAPE_PERFECT_MIN)      outcome = 'perfect_escape';
  else if (total >= ESCAPE_PARTIAL_MIN) outcome = 'partial_escape';
  else                                  outcome = 'disastrous_fail';
  return { dice, cha, total, outcome };
}

// ─── Respect Tier ────────────────────────────────────────────────────
export function respectTier(respect: number): RespectTier {
  if (respect >= RESPECT_BLOOD_BROTHERS_MIN) return 'blood_brothers';
  if (respect >= RESPECT_PROFESSIONAL_MIN)   return 'professional';
  if (respect >= RESPECT_DICK_MIN)           return 'dick';
  if (respect >= RESPECT_HOSTILE_MIN)        return 'hostile_rival';
  return 'nemesis';
}

// ─── Abandonment Penalty ─────────────────────────────────────────────
/** Returns the respect penalty (negative number) for escaping.
 *  Returns 0 if any teammate is below 25 % HP (tactical retreat). */
export function abandonmentPenalty(
  teammateHpRatios: number[],
): number {
  const anyLowHp = teammateHpRatios.some(r => r < TACTICAL_RETREAT_HP_THRESHOLD);
  if (anyLowHp) return 0;
  return -(ABANDON_PENALTY_MIN + Math.floor(Math.random() * (ABANDON_PENALTY_MAX - ABANDON_PENALTY_MIN + 1)));
}

// ─── Leadership Tier ─────────────────────────────────────────────────
export function leadershipTier(level: number): LeadershipTier {
  if (level <= LEADERSHIP_STRANGER_MAX)   return 'stranger';
  if (level <= LEADERSHIP_STRATEGIST_MAX) return 'strategist';
  return 'commander';
}

// ─── Suggestion Roll (Strategist tier) ───────────────────────────────
export type SuggestionOutcome = 'coordinated' | 'reluctant' | 'refusal';

export function performSuggestionRoll(cha: number): { total: number; outcome: SuggestionOutcome } {
  const dice = rollD5x4();
  const total = dice + cha;
  let outcome: SuggestionOutcome;
  if (total >= 10)     outcome = 'coordinated';
  else if (total >= 6) outcome = 'reluctant';
  else                 outcome = 'refusal';
  return { total, outcome };
}

// ─── Hiten Meter helpers ─────────────────────────────────────────────
export function gainHitenBar(currentBars: number): number {
  return Math.min(currentBars + HITEN_GAIN_PER_STRIKE, HITEN_MAX_BARS);
}

// ─── Stat lookup helper ──────────────────────────────────────────────
export function getStatValue(stats: PlayerStats, key: string): number {
  const k = key.toLowerCase() as keyof PlayerStats;
  return stats[k] ?? 0;
}
