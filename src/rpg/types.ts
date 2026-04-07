/**
 * Elemental Synergy System — Type Definitions
 *
 * Five core elements that every character card carries.
 * Elements drive team synergy boosts, discord penalties,
 * dual-ultimate combos, and respect modifiers.
 */

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

/** The five core spiritual elements. */
export type Element = 'storm' | 'fire' | 'water' | 'earth' | 'light';

/** Stat primarily boosted by each element. */
export type PrimaryStat = 'DEX' | 'STR' | 'WIS' | 'CON' | 'CHA';

/** Metadata for a single element. */
export interface ElementInfo {
  id: Element;
  label: string;
  theme: string;
  primaryStat: PrimaryStat;
  synergyName: string;
  synergyDescription: string;
}

// ---------------------------------------------------------------------------
// Synergy / Discord
// ---------------------------------------------------------------------------

/** Whether two elements are harmonious, neutral, or clashing. */
export type SynergyRelation = 'harmonious' | 'neutral' | 'clashing';

/** A passive chain-reaction produced by two harmonious elements. */
export interface ChainReaction {
  elements: [Element, Element];
  name: string;
  description: string;
}

/** A penalty imposed when two clashing elements share a team. */
export interface DiscordPenalty {
  elements: [Element, Element];
  rollPenalty: number;          // e.g. -1 to all D5 rolls
  respectThreshold: number;     // penalty lifts above this % (0-100)
}

/** Active team synergy boost derived from matching elements. */
export interface TeamBoost {
  synergyName: string;
  description: string;
  stat: PrimaryStat | 'initiative' | 'evasion' | 'maxHp' | 'specialRate' | 'damage';
  value: number;
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

/** Combat class (rock-paper-scissors triangle). */
export type CombatClass = 'combat_specialist' | 'kido_master' | 'tank';

/** A character's elemental card data. */
export interface CharacterElement {
  name: string;
  element: Element;
  combatClass: CombatClass;
  /** Starting respect % when first meeting Kenshin (0-100). */
  startingRespect: number;
}

// ---------------------------------------------------------------------------
// Dual-Ultimate Combos
// ---------------------------------------------------------------------------

export type UltimateTier = 1 | 2;

export interface DualUltimate {
  tier: UltimateTier;
  /** Character names involved (first is always Kenshin). */
  participants: [string, string];
  name: string;
  description: string;
  /** Total special bars consumed (sum of both participants). */
  totalBarCost: number;
  /** Minimum command level required. */
  minCommandLevel: number;
  /** Minimum respect % required between participants. */
  minRespect: number;
  /** Damage formula multiplier applied to combined stats. */
  damageMultiplier: number;
  /** Turns of exhaustion inflicted on participants after use. */
  exhaustionTurns: number;
}

// ---------------------------------------------------------------------------
// Training Domains
// ---------------------------------------------------------------------------

export interface TrainingDomain {
  id: string;
  name: string;
  stat: PrimaryStat;
  environment: string;
  mentors: string[];
}

// ---------------------------------------------------------------------------
// Narrator / Love Interest
// ---------------------------------------------------------------------------

export interface NarratorProfile {
  name: string;
  element: Element;
  vibe: string;
  /** Passive buff at 100% affection. */
  blessingName: string;
  blessingDescription: string;
}

// ---------------------------------------------------------------------------
// Party Member (runtime)
// ---------------------------------------------------------------------------

export interface PartyMember {
  name: string;
  hp: number;
  maxHp: number;
  portrait: string;
  element: Element;
  combatClass: CombatClass;
  specialMeter: number;       // 0-3 bars
  respect: number;            // 0-100
  isExhausted: boolean;
  exhaustionTurns: number;
}

// ---------------------------------------------------------------------------
// RPG Internal State (extends what Stage already tracks)
// ---------------------------------------------------------------------------

export interface RPGInternalState {
  // Existing scalars
  numChars: number;
  numUsers: number;
  hp: number;
  bloodlust: number;
  kan: number;
  respect: number;
  location: string;
  sword_condition: string;
  sword_type: string;
  is_bankai_active: boolean;
  is_night_scene: boolean;
  active_cutaway_id: string | null;

  // Party
  party: PartyMember[];

  // Romance / Narrator
  romance: Record<string, number>;
  narrator: string | null;              // key into NARRATORS
  narratorAffection: number;            // 0-100

  // Elemental Synergy
  activeBoosts: TeamBoost[];
  activeChainReactions: string[];       // names of active chains
  activeDiscordPenalties: string[];     // "element+element" keys
  commandLevel: number;                 // 0-30

  // Training
  lastTrainingDomain: string | null;

  // Allow additional dynamic keys
  [key: string]: any;
}
