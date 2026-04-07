/**
 * Elemental Synergy System — Mechanics
 *
 * Pure-function helpers that compute team boosts, discord penalties,
 * chain reactions, dual-ultimate eligibility, training outcomes,
 * and respect modifiers based on elemental affiliation.
 */

import {
  Element,
  TeamBoost,
  ChainReaction,
  DiscordPenalty,
  DualUltimate,
  PartyMember,
  TrainingDomain,
} from './types';

import {
  getSynergyRelation,
  CHAIN_REACTIONS,
  DISCORD_PENALTIES,
  ELEMENT_BOOSTS,
  DUAL_ULTIMATES,
  TRAINING_DOMAINS,
} from './constants';

// ---------------------------------------------------------------------------
// Team Synergy Evaluation
// ---------------------------------------------------------------------------

export interface SynergyReport {
  boosts: TeamBoost[];
  chains: ChainReaction[];
  discords: DiscordPenalty[];
}

/**
 * Given the current party, compute all active boosts, chain reactions,
 * and discord penalties based on the elements present.
 */
export function evaluateTeamSynergy(
  party: Pick<PartyMember, 'element' | 'respect'>[],
): SynergyReport {
  const boosts: TeamBoost[] = [];
  const chains: ChainReaction[] = [];
  const discords: DiscordPenalty[] = [];

  // Collect unique elements present in the party
  const elementSet = new Set<Element>(party.map((m) => m.element));

  // --- 1. Element Boosts (need ≥2 members with harmonious elements) ---
  for (const el of elementSet) {
    const count = party.filter((m) => m.element === el).length;
    if (count >= 2) {
      boosts.push(ELEMENT_BOOSTS[el]);
    }
  }

  // --- 2. Cross-element harmony boosts & chain reactions ---
  const elements = Array.from(elementSet);
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const rel = getSynergyRelation(elements[i], elements[j]);
      if (rel === 'harmonious') {
        // add the element boosts for both sides (if not already present)
        for (const el of [elements[i], elements[j]]) {
          if (!boosts.find((b) => b.synergyName === ELEMENT_BOOSTS[el].synergyName)) {
            boosts.push(ELEMENT_BOOSTS[el]);
          }
        }

        // check chain reactions
        for (const cr of CHAIN_REACTIONS) {
          const [a, b] = cr.elements;
          if (
            (a === elements[i] && b === elements[j]) ||
            (a === elements[j] && b === elements[i])
          ) {
            chains.push(cr);
          }
        }
      }
    }
  }

  // --- 3. Discord penalties ---
  for (let i = 0; i < party.length; i++) {
    for (let j = i + 1; j < party.length; j++) {
      const rel = getSynergyRelation(party[i].element, party[j].element);
      if (rel === 'clashing') {
        // Only apply if mutual respect is below threshold
        const avgRespect = (party[i].respect + party[j].respect) / 2;
        for (const dp of DISCORD_PENALTIES) {
          const [a, b] = dp.elements;
          if (
            (a === party[i].element && b === party[j].element) ||
            (a === party[j].element && b === party[i].element)
          ) {
            if (avgRespect < dp.respectThreshold) {
              discords.push(dp);
            }
          }
        }
      }
    }
  }

  return { boosts, chains, discords };
}

// ---------------------------------------------------------------------------
// Dual-Ultimate Eligibility
// ---------------------------------------------------------------------------

export interface UltimateCheck {
  available: boolean;
  reason: string;
  ultimate: DualUltimate | null;
}

/**
 * Check whether a dual-ultimate between two party members can fire.
 */
export function checkDualUltimate(
  memberA: PartyMember,
  memberB: PartyMember,
  commandLevel: number,
): UltimateCheck {
  const match = DUAL_ULTIMATES.find(
    (u) =>
      (u.participants[0] === memberA.name && u.participants[1] === memberB.name) ||
      (u.participants[0] === memberB.name && u.participants[1] === memberA.name),
  );

  if (!match) {
    return { available: false, reason: 'No dual-ultimate defined for this pair.', ultimate: null };
  }

  const barCostEach = match.totalBarCost / 2;
  if (memberA.specialMeter < barCostEach || memberB.specialMeter < barCostEach) {
    return {
      available: false,
      reason: `Not enough special bars (need ${barCostEach} each).`,
      ultimate: match,
    };
  }

  if (commandLevel < match.minCommandLevel) {
    return {
      available: false,
      reason: `Command level ${commandLevel} is below the required ${match.minCommandLevel}.`,
      ultimate: match,
    };
  }

  const respect = Math.min(memberA.respect, memberB.respect);
  if (respect < match.minRespect) {
    return {
      available: false,
      reason: `Mutual respect ${respect}% is below the required ${match.minRespect}%.`,
      ultimate: match,
    };
  }

  return { available: true, reason: 'Ready to fire!', ultimate: match };
}

/**
 * Execute a dual-ultimate. Returns updated copies of the two members
 * with meters drained and exhaustion applied.
 * Damage is calculated as the sum of participants' max HP × the move's multiplier.
 */
export function executeDualUltimate(
  memberA: PartyMember,
  memberB: PartyMember,
  ultimate: DualUltimate,
): { a: PartyMember; b: PartyMember; damage: number } {
  const barCostEach = ultimate.totalBarCost / 2;

  const a: PartyMember = {
    ...memberA,
    specialMeter: memberA.specialMeter - barCostEach,
    isExhausted: ultimate.exhaustionTurns > 0,
    exhaustionTurns: ultimate.exhaustionTurns,
  };

  const b: PartyMember = {
    ...memberB,
    specialMeter: memberB.specialMeter - barCostEach,
    isExhausted: ultimate.exhaustionTurns > 0,
    exhaustionTurns: ultimate.exhaustionTurns,
  };

  // Damage = combined max HP × move multiplier
  const damage = (memberA.maxHp + memberB.maxHp) * ultimate.damageMultiplier;

  return { a, b, damage };
}

// ---------------------------------------------------------------------------
// Training Roll
// ---------------------------------------------------------------------------

export interface TrainingResult {
  roll: number;
  outcome: 'perfect' | 'mixed' | 'fail';
  statGain: number;
  hpCost: number;
  mentorFound: string | null;
}

/**
 * Simulate a training session using a D5×4 + WIS roll.
 *
 * - 10+  → Perfect: +2 stat, mentor found
 * -  6-9 → Mixed:   +1 stat, -20 HP
 * -  1-5 → Fail:    +0 stat, exhausted
 */
export function rollTraining(
  domainId: string,
  wisModifier: number,
): TrainingResult {
  const domain = TRAINING_DOMAINS.find((d) => d.id === domainId);

  // D5 × 4 (four dice, each 1-5)
  const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 5) + 1);
  const rawRoll = dice.reduce((s, d) => s + d, 0);
  const roll = rawRoll + wisModifier;

  let outcome: TrainingResult['outcome'];
  let statGain: number;
  let hpCost: number;
  let mentorFound: string | null = null;

  if (roll >= 10) {
    outcome = 'perfect';
    statGain = 2;
    hpCost = 0;
    if (domain && domain.mentors.length > 0) {
      mentorFound = domain.mentors[Math.floor(Math.random() * domain.mentors.length)];
    }
  } else if (roll >= 6) {
    outcome = 'mixed';
    statGain = 1;
    hpCost = 20;
  } else {
    outcome = 'fail';
    statGain = 0;
    hpCost = 0; // no HP loss but exhausted
  }

  return { roll, outcome, statGain, hpCost, mentorFound };
}

// ---------------------------------------------------------------------------
// Respect Modifier (element affinity)
// ---------------------------------------------------------------------------

/**
 * Returns a multiplier (e.g. 1.05 or 0.95) that modifies respect gain
 * between two characters based on their elemental relationship.
 *
 * - Harmonious → +5 % faster respect gain
 * - Clashing   → -5 % slower respect gain
 */
export function respectMultiplier(e1: Element, e2: Element): number {
  const rel = getSynergyRelation(e1, e2);
  switch (rel) {
    case 'harmonious':
      return 1.05;
    case 'clashing':
      return 0.95;
    default:
      return 1.0;
  }
}

// ---------------------------------------------------------------------------
// Command Level → Chain Trigger Chance
// ---------------------------------------------------------------------------

/**
 * At command levels 0-10, chain reactions trigger randomly (D5 roll ≥ 3).
 * At 11-20, player can suggest combos (always triggers).
 * At 20+, player can trigger dual-elemental ultimates.
 */
export function chainTriggerChance(commandLevel: number): number {
  if (commandLevel >= 11) return 1.0;          // 100 %
  // D5 ≥ 3 means 3/5 = 60 %
  return 0.6;
}

/**
 * Roll whether a chain reaction fires (levels 0-10).
 */
export function rollChainTrigger(commandLevel: number): boolean {
  if (commandLevel >= 11) return true;
  return Math.random() < chainTriggerChance(commandLevel);
}
