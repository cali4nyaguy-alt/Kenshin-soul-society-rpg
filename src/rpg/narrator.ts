// ─────────────────────────────────────────────────────────────
// src/rpg/narrator.ts  —  Narrator system, buff tiers & perks
// ─────────────────────────────────────────────────────────────

// ── Element ──────────────────────────────────────────────────
export type Element = 'storm' | 'fire' | 'water' | 'earth' | 'light';

// ── Buff tier system ─────────────────────────────────────────
export type BuffTier = 'minor' | 'major' | 'god';

export interface BuffDefinition {
  name: string;
  tier: BuffTier;
  description: string;
  /** Stat key → flat bonus (Tier 1‑2) */
  statBonus?: Partial<Record<string, number>>;
  /** Flat HP bonus (Tier 1) */
  flatHpBonus?: number;
  /** Roll bonus applied to a specific stat's rolls (Tier 2) */
  rollBonus?: { stat: string; bonus: number };
  /** Special meter gain per turn (Tier 2) */
  meterPerTurn?: number;
  /** Rule‑breaker passive function name (Tier 3) */
  passiveKey?: string;
  /** Negative recoil to keep balance */
  recoil?: {
    description: string;
    hpDrain?: number;
    cardLoss?: boolean;
    statPenalty?: Partial<Record<string, number>>;
  };
}

/** Pre‑configured tier boundaries for auto‑generation sanity‑checks. */
export const BUFF_TIER_LIMITS: Record<BuffTier, { maxStatBonus: number; maxRollBonus: number }> = {
  minor: { maxStatBonus: 2, maxRollBonus: 0 },
  major: { maxStatBonus: 0, maxRollBonus: 8 },
  god:   { maxStatBonus: Infinity, maxRollBonus: Infinity },
};

// ── Environmental perks ──────────────────────────────────────
export type EnvironmentalPerkType = 'hidden_item' | 'danger_warning';

export interface EnvironmentalPerk {
  type: EnvironmentalPerkType;
  /** Narrator cue phrase that signals this perk */
  cuePhrase: string;
  /** Mechanical effect description */
  effect: string;
}

// ── Narrator bond ────────────────────────────────────────────
export interface NarratorBond {
  respect: number;   // 0‑100
  affection: number; // 0‑100
}

// ── Narrator definition ──────────────────────────────────────
export interface NarratorDefinition {
  key: string;
  name: string;
  narrativeStyle: string;
  startingBond: NarratorBond;
  /** Passive that activates at 100 % affection */
  passiveEffect: BuffDefinition;
  /** Environmental perks granted by this narrator */
  environmentalPerks: EnvironmentalPerk[];
}

// ── Orihime Inoue narrator data ──────────────────────────────
export const NARRATOR_ORIHIME: NarratorDefinition = {
  key: 'orihime',
  name: 'Orihime Inoue',
  narrativeStyle:
    'Her voice is soft, filled with a kindness that physically mends your wounds as you fight.',
  startingBond: { respect: 75, affection: 10 },
  passiveEffect: {
    name: 'Santen Kesshun',
    tier: 'god',
    description: 'Kenshin regenerates 10% Max HP at the start of every turn.',
    passiveKey: 'santen_kesshun',
  },
  environmentalPerks: [
    {
      type: 'hidden_item',
      cuePhrase: 'something delicious',
      effect: 'Marks a Healing Item or Gift on the map.',
    },
    {
      type: 'hidden_item',
      cuePhrase: 'pretty flower',
      effect: 'Marks a Healing Item or Gift on the map.',
    },
    {
      type: 'danger_warning',
      cuePhrase: 'his heart feels very cold',
      effect: 'Alerts you to a Tank or Hostile enemy.',
    },
  ],
};

// ── All available narrators (extend later) ───────────────────
export const NARRATORS: Record<string, NarratorDefinition> = {
  orihime: NARRATOR_ORIHIME,
};

// ── Helper: apply Orihime's start‑of‑turn passive ───────────
/**
 * Applies the Santen Kesshun passive: heals Kenshin for 10 % of maxHp.
 * Returns the amount healed (0 if passive is not active).
 */
export function applySantenKesshun(
  hp: number,
  maxHp: number,
  affection: number,
): { newHp: number; healed: number } {
  if (affection < 100) return { newHp: hp, healed: 0 };
  const healAmount = Math.round(maxHp * 0.1);
  const newHp = Math.min(hp + healAmount, maxHp);
  return { newHp, healed: newHp - hp };
}

// ── Helper: detect environmental perks in narrator text ──────
/**
 * Scans narration text for environmental perk cue phrases.
 * Returns an array of matched perks.
 */
export function detectEnvironmentalPerks(
  narratorKey: string,
  text: string,
): EnvironmentalPerk[] {
  const def = NARRATORS[narratorKey];
  if (!def) return [];
  const lower = text.toLowerCase();
  return def.environmentalPerks.filter((p) => lower.includes(p.cuePhrase.toLowerCase()));
}
