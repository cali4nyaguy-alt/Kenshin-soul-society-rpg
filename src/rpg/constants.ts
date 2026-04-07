/**
 * Elemental Synergy System — Constants & Data Tables
 *
 * Static look-up tables for elements, characters, synergies,
 * training domains, narrators, and dual-ultimate combos.
 */

import {
  Element,
  ElementInfo,
  SynergyRelation,
  ChainReaction,
  DiscordPenalty,
  TeamBoost,
  CharacterElement,
  DualUltimate,
  TrainingDomain,
  NarratorProfile,
} from './types';

// ---------------------------------------------------------------------------
// Element Definitions
// ---------------------------------------------------------------------------

export const ELEMENTS: Record<Element, ElementInfo> = {
  storm: {
    id: 'storm',
    label: 'Storm (Lightning/Wind)',
    theme: 'Kenshin / Soi Fon',
    primaryStat: 'DEX',
    synergyName: 'Haste',
    synergyDescription: '+2 to Initiative for the whole team.',
  },
  fire: {
    id: 'fire',
    label: 'Fire',
    theme: 'Yamamoto / Ichigo',
    primaryStat: 'STR',
    synergyName: 'Ignite',
    synergyDescription: 'Adds +5 flat damage to all successful strikes.',
  },
  water: {
    id: 'water',
    label: 'Water / Ice',
    theme: 'Toshiro / Rukia',
    primaryStat: 'WIS',
    synergyName: 'Chill',
    synergyDescription: 'Enemies have -2 to their Evasion rolls.',
  },
  earth: {
    id: 'earth',
    label: 'Earth',
    theme: 'Chad / Kenpachi',
    primaryStat: 'CON',
    synergyName: 'Fortress',
    synergyDescription: 'All teammates gain +20 Max HP.',
  },
  light: {
    id: 'light',
    label: 'Light / Spirit',
    theme: 'Orihime / Uryu',
    primaryStat: 'CHA',
    synergyName: 'Resonance',
    synergyDescription: 'Special Meter fills 20% faster.',
  },
};

// ---------------------------------------------------------------------------
// Synergy Relation Matrix
// ---------------------------------------------------------------------------

/** Ordered pair → relation.  Pairs not listed are 'neutral'. */
const SYNERGY_PAIRS: Array<{ a: Element; b: Element; relation: SynergyRelation }> = [
  // Harmonious
  { a: 'storm', b: 'water', relation: 'harmonious' },
  { a: 'fire',  b: 'earth', relation: 'harmonious' },
  { a: 'light', b: 'storm', relation: 'harmonious' },
  { a: 'light', b: 'water', relation: 'harmonious' },
  { a: 'earth', b: 'light', relation: 'harmonious' },

  // Clashing
  { a: 'fire',  b: 'water', relation: 'clashing' },
  { a: 'storm', b: 'earth', relation: 'clashing' },
];

/**
 * Look up the synergy relation between two elements.
 * Order does not matter — both (a,b) and (b,a) are checked.
 */
export function getSynergyRelation(e1: Element, e2: Element): SynergyRelation {
  if (e1 === e2) return 'harmonious';              // same element
  for (const p of SYNERGY_PAIRS) {
    if ((p.a === e1 && p.b === e2) || (p.a === e2 && p.b === e1)) {
      return p.relation;
    }
  }
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Chain Reactions (Harmonious pairs)
// ---------------------------------------------------------------------------

export const CHAIN_REACTIONS: ChainReaction[] = [
  {
    elements: ['storm', 'water'],
    name: 'Conduction',
    description: 'Lightning attacks now have an Area-of-Effect (AoE) jump.',
  },
  {
    elements: ['fire', 'earth'],
    name: 'Magma',
    description: 'Attacks reduce enemy CON for 2 turns.',
  },
  {
    elements: ['light', 'storm'],
    name: 'Precision Strike',
    description: "Kenshin's Godspeed hits are guaranteed criticals if the Light ally hits first.",
  },
  {
    elements: ['light', 'water'],
    name: 'Purifying Frost',
    description: 'Healing effects also cleanse all debuffs from the team.',
  },
  {
    elements: ['earth', 'light'],
    name: 'Sacred Ground',
    description: 'The team is immune to environmental damage for 3 turns.',
  },
];

// ---------------------------------------------------------------------------
// Discord Penalties (Clashing pairs)
// ---------------------------------------------------------------------------

export const DISCORD_PENALTIES: DiscordPenalty[] = [
  {
    elements: ['fire', 'water'],
    rollPenalty: -1,           // -1 to all D5 rolls
    respectThreshold: 50,      // lifts at 50 % mutual respect
  },
  {
    elements: ['storm', 'earth'],
    rollPenalty: -1,
    respectThreshold: 50,
  },
];

// ---------------------------------------------------------------------------
// Character Element Assignments
// ---------------------------------------------------------------------------

export const CHARACTER_ELEMENTS: CharacterElement[] = [
  // — Karakura Gang (start at 75 %) —
  { name: 'Kenshin',   element: 'storm', combatClass: 'combat_specialist', startingRespect: 100 },
  { name: 'Ichigo',    element: 'fire',  combatClass: 'combat_specialist', startingRespect: 75 },
  { name: 'Orihime',   element: 'light', combatClass: 'kido_master',      startingRespect: 75 },
  { name: 'Chad',      element: 'earth', combatClass: 'tank',             startingRespect: 75 },
  { name: 'Uryu',      element: 'light', combatClass: 'combat_specialist', startingRespect: 75 },

  // — Gotei Lieutenants (start at 50 %) —
  { name: 'Rukia',     element: 'water', combatClass: 'kido_master',      startingRespect: 50 },
  { name: 'Rangiku',   element: 'storm', combatClass: 'kido_master',      startingRespect: 50 },
  { name: 'Ikkaku',    element: 'fire',  combatClass: 'combat_specialist', startingRespect: 50 },

  // — Gotei Captains (start at 30 %) —
  { name: 'Toshiro',   element: 'water', combatClass: 'kido_master',      startingRespect: 30 },
  { name: 'Byakuya',   element: 'light', combatClass: 'kido_master',      startingRespect: 30 },
  { name: 'Kenpachi',  element: 'earth', combatClass: 'combat_specialist', startingRespect: 30 },
  { name: 'Soi Fon',   element: 'storm', combatClass: 'combat_specialist', startingRespect: 30 },
  { name: 'Shunsui',   element: 'storm', combatClass: 'combat_specialist', startingRespect: 30 },
  { name: 'Unohana',   element: 'water', combatClass: 'kido_master',      startingRespect: 30 },
  { name: 'Komamura',  element: 'earth', combatClass: 'tank',             startingRespect: 30 },
  { name: 'Yoruichi',  element: 'storm', combatClass: 'combat_specialist', startingRespect: 30 },

  // — Captain-Commander (starts at 0 %) —
  { name: 'Yamamoto',  element: 'fire',  combatClass: 'kido_master',      startingRespect: 0 },

  // — Squad Zero —
  { name: 'Nimaiya',   element: 'storm', combatClass: 'combat_specialist', startingRespect: 0 },
  { name: 'Ichibē',    element: 'light', combatClass: 'kido_master',      startingRespect: 0 },
  { name: 'Shutara',   element: 'light', combatClass: 'tank',             startingRespect: 0 },
  { name: 'Kirio',     element: 'earth', combatClass: 'kido_master',      startingRespect: 0 },
  { name: 'Tenjirō',   element: 'water', combatClass: 'kido_master',      startingRespect: 0 },
];

/** Quick lookup by name (case-insensitive). */
export function getCharacterElement(name: string): CharacterElement | undefined {
  const lower = name.toLowerCase();
  return CHARACTER_ELEMENTS.find((c) => c.name.toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// Dual-Ultimate Combos
// ---------------------------------------------------------------------------

export const DUAL_ULTIMATES: DualUltimate[] = [
  // — Tier 1: Dual-Strike (4 bars total = 2 + 2) —
  {
    tier: 1,
    participants: ['Kenshin', 'Ichigo'],
    name: 'Plasma Overload',
    description: 'A massive explosion of heat and speed.',
    totalBarCost: 4,
    minCommandLevel: 11,
    minRespect: 50,
    damageMultiplier: 5,
    exhaustionTurns: 0,
  },
  {
    tier: 1,
    participants: ['Kenshin', 'Orihime'],
    name: 'Holy Thunder',
    description: 'Heals the party while striking all enemies with lightning.',
    totalBarCost: 4,
    minCommandLevel: 11,
    minRespect: 50,
    damageMultiplier: 4,
    exhaustionTurns: 0,
  },
  {
    tier: 1,
    participants: ['Kenshin', 'Uryu'],
    name: 'Railgun Arrow',
    description: 'A single-target strike with 100% Accuracy and Infinite Reach.',
    totalBarCost: 4,
    minCommandLevel: 11,
    minRespect: 50,
    damageMultiplier: 6,
    exhaustionTurns: 0,
  },
  {
    tier: 1,
    participants: ['Kenshin', 'Toshiro'],
    name: 'Frozen Bolt',
    description: 'Deals high damage to all enemies and Freezes them for 1 turn.',
    totalBarCost: 4,
    minCommandLevel: 11,
    minRespect: 50,
    damageMultiplier: 5,
    exhaustionTurns: 0,
  },

  // — Tier 2: Board Wipe (6 bars total = 3 + 3) —
  {
    tier: 2,
    participants: ['Kenshin', 'Ichigo'],
    name: 'Saigo no Amakakeru',
    description:
      'Kenshin manifests Lightning Dragon Wings at maximum span, carrying Ichigo at speeds that transcend time. The Will-Blade shatters spiritual armor while the Final Getsuga Tenshō follows through.',
    totalBarCost: 6,
    minCommandLevel: 20,
    minRespect: 75,
    damageMultiplier: 10,
    exhaustionTurns: 2,
  },
  {
    tier: 2,
    participants: ['Kenshin', 'Toshiro'],
    name: 'Storm-Cloud Tsunami',
    description:
      'A massive surge of electrified water that bypasses all armor and kido shields.',
    totalBarCost: 6,
    minCommandLevel: 20,
    minRespect: 100,
    damageMultiplier: 10,
    exhaustionTurns: 2,
  },
  {
    tier: 2,
    participants: ['Kenshin', 'Yamamoto'],
    name: 'Tenchi Kaijin (Heaven and Earth Ash)',
    description:
      "The most powerful move in the RPG — the combined fury of Storm and Fire obliterates the battlefield.",
    totalBarCost: 6,
    minCommandLevel: 20,
    minRespect: 100,
    damageMultiplier: 15,
    exhaustionTurns: 2,
  },
];

// ---------------------------------------------------------------------------
// Training Domains
// ---------------------------------------------------------------------------

export const TRAINING_DOMAINS: TrainingDomain[] = [
  {
    id: 'bamboo_thicket',
    name: 'The Bamboo Thicket',
    stat: 'DEX',
    environment: 'A dense, swaying forest requiring high speed to navigate.',
    mentors: ['Soi Fon', 'Yoruichi', 'Byakuya'],
  },
  {
    id: 'iron_quarry',
    name: 'The Iron Quarry',
    stat: 'STR',
    environment: 'A heavy-gravity zone where you must move massive boulders.',
    mentors: ['Kenpachi', 'Ikkaku', 'Chad'],
  },
  {
    id: 'meditation_falls',
    name: 'The Meditation Falls',
    stat: 'WIS',
    environment: 'A freezing waterfall where you must sense the Ki of the water.',
    mentors: ['Unohana', 'Toshiro', 'Uryu'],
  },
  {
    id: 'tea_garden',
    name: 'The Tea Garden',
    stat: 'CHA',
    environment: 'A social hub for tea ceremonies and high-level debate.',
    mentors: ['Shunsui', 'Rangiku', 'Orihime'],
  },
  {
    id: 'soul_forge',
    name: 'The Soul Forge',
    stat: 'CON',
    environment: 'A high-pressure spiritual furnace that toughens the spirit.',
    mentors: ['Yamamoto', 'Komamura', 'Ichigo'],
  },
];

// ---------------------------------------------------------------------------
// Narrators / Love Interests
// ---------------------------------------------------------------------------

export const NARRATORS: Record<string, NarratorProfile> = {
  rukia: {
    name: 'Rukia Kuchiki',
    element: 'water',
    vibe: "The Soul's Voice — Poetic, formal, deeply knowledgeable about Soul Society history.",
    blessingName: 'Gazing Moon',
    blessingDescription: 'WIS modifier is added to all DEX rolls.',
  },
  orihime: {
    name: 'Orihime Inoue',
    element: 'light',
    vibe: "The Warm Heart — Gentle, descriptive of smells/colors, very protective of Kenshin's health.",
    blessingName: 'Shining Aegis',
    blessingDescription: 'Passive +10 HP regeneration per turn.',
  },
  rangiku: {
    name: 'Rangiku Matsumoto',
    element: 'storm',
    vibe: "The Lively Spirit — Humorous, focuses on the fun side of life, loves good drama.",
    blessingName: 'Golden Aura',
    blessingDescription: 'Enemies have -4 penalty to hit Kenshin (Distracted).',
  },
  soifon: {
    name: 'Soi Fon',
    element: 'storm',
    vibe: "The Shadow's Eye — Short, efficient, focuses on danger levels and tactical weaknesses.",
    blessingName: 'Shadow Veil',
    blessingDescription: 'First attack each turn is guaranteed stealth (cannot be countered).',
  },
  yoruichi: {
    name: 'Yoruichi Shihōin',
    element: 'storm',
    vibe: 'The Master Tease — Confident, witty, describes the world in terms of speed and rhythm.',
    blessingName: 'Flash Step Mastery',
    blessingDescription: 'First movement each turn is instantaneous; ignores Attacks of Opportunity.',
  },
  unohana: {
    name: 'Retsu Unohana',
    element: 'water',
    vibe: 'The Serene Blade — Calm serenity that anchors the soul even in the heat of slaughter.',
    blessingName: 'Instant Stillness',
    blessingDescription:
      "Use Sword Meditation as a Free Action (0 cost) once per turn. Clears 10% Bloodlust/Exhaustion instantly.",
  },
};

// ---------------------------------------------------------------------------
// Element-Based Team Boosts (when ≥2 members share a harmonious element)
// ---------------------------------------------------------------------------

export const ELEMENT_BOOSTS: Record<Element, TeamBoost> = {
  storm: {
    synergyName: 'Haste',
    description: '+2 to Initiative for the whole team.',
    stat: 'initiative',
    value: 2,
  },
  fire: {
    synergyName: 'Ignite',
    description: '+5 flat damage to all successful strikes.',
    stat: 'damage',
    value: 5,
  },
  water: {
    synergyName: 'Chill',
    description: 'Enemies have -2 to their Evasion rolls.',
    stat: 'evasion',
    value: -2,
  },
  earth: {
    synergyName: 'Fortress',
    description: 'All teammates gain +20 Max HP.',
    stat: 'maxHp',
    value: 20,
  },
  light: {
    synergyName: 'Resonance',
    description: 'Special Meter fills 20% faster.',
    stat: 'specialRate',
    value: 20,
  },
};
