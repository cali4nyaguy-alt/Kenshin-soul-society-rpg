// ─── Combat Archetype Triangle ───────────────────────────────────────
export type ClassType = 'combat_specialist' | 'kido_master' | 'tank' | 'healer';

// ─── Respect Tiers ───────────────────────────────────────────────────
export type RespectTier =
  | 'blood_brothers'   // 75–100 %
  | 'professional'     // 26–74 %
  | 'dick'             // 16–25 %
  | 'hostile_rival'    //  1–15 %
  | 'nemesis';         //  0 %

// ─── Leadership Tiers ────────────────────────────────────────────────
export type LeadershipTier = 'stranger' | 'strategist' | 'commander';

// ─── Dialogue Choices ────────────────────────────────────────────────
export type DialogueOption = 'chat' | 'progress' | 'sass' | 'custom' | 'escape';

// ─── Combat Roll Result ──────────────────────────────────────────────
export type RollOutcome = 'fail' | 'mixed' | 'perfect';

// ─── Escape Result ───────────────────────────────────────────────────
export type EscapeOutcome = 'perfect_escape' | 'partial_escape' | 'disastrous_fail';

// ─── Card Slot Types ─────────────────────────────────────────────────
export type CardCategory = 'discipline' | 'weapon' | 'stat_buff' | 'team_up';

export interface Card {
  id: string;
  name: string;
  category: CardCategory;
  description: string;
  effect: Record<string, number>;      // e.g. { dex: +1 } or { hp: +25 }
  isDamaged: boolean;                   // training penalty can damage cards
  damageRemainingBattles: number;       // 0 = not damaged
}

// ─── NPC Respect Record ──────────────────────────────────────────────
export interface NpcRespect {
  name: string;
  respect: number;          // 0 – 100
  classType: ClassType;
  isRecruited: boolean;
  recruitTier: 'lieutenant' | 'captain' | null;
}

// ─── Training Session Outcome ────────────────────────────────────────
export interface TrainingResult {
  mentor: string;
  statGained: string;
  statAmount: number;
  penalty: string;            // human-readable description
}

// ─── Enemy / NPC Template ────────────────────────────────────────────
export interface EnemyTemplate {
  name: string;
  classType: ClassType;
  level: number;
  hp: number;
  threatNote: string;
}

// ─── Player Core Stats ───────────────────────────────────────────────
export interface PlayerStats {
  dex: number;   // Dexterity
  cha: number;   // Charisma
  wis: number;   // Wisdom
  str: number;   // Strength
  con: number;   // Constitution
}

// ─── Hiten Meter ─────────────────────────────────────────────────────
export interface HitenMeter {
  bars: number;        // 0 – 3
  maxBars: number;     // 3
}

// ─── Full RPG State (stored in myInternalState) ──────────────────────
export interface RPGState {
  // Identity
  level: number;
  classType: ClassType;

  // Core Stats
  stats: PlayerStats;

  // Health & Special
  hp: number;
  maxHp: number;
  hitenMeter: HitenMeter;

  // Economy
  kan: number;

  // Combat
  actionsPerTurn: number;
  bloodlust: number;

  // Cards (5 slots max by level 20+)
  cards: (Card | null)[];
  maxCardSlots: number;

  // Social / Respect
  npcRespect: Record<string, NpcRespect>;
  globalRespect: number;  // legacy compat

  // Leadership
  leadershipTier: LeadershipTier;

  // Location & World
  location: string;
  swordCondition: string;
  swordType: string;
  isBankaiActive: boolean;
  isNightScene: boolean;
  activeCutawayId: string | null;

  // Party
  party: PartyMember[];

  // Romance
  romance: Record<string, number>;

  // Misc counters
  numChars: number;
  numUsers: number;

  // Empowerment flags
  empowered: boolean;          // e.g. Nimaiya +2 to first roll
  empoweredBonus: number;
}

export interface PartyMember {
  name: string;
  hp: number;
  maxHp: number;
  portrait: string;
  classType?: ClassType;
  level?: number;
  isActive: boolean;
}
