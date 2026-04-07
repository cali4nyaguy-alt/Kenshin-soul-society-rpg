import { ClassType, NpcRespect, PlayerStats } from './types';

// ─── Class Advantage Map ─────────────────────────────────────────────
// Key beats Value  (Combat > Kido > Tank > Combat;  Healer is neutral)
export const CLASS_ADVANTAGE: Record<ClassType, ClassType | null> = {
  combat_specialist: 'kido_master',
  kido_master: 'tank',
  tank: 'combat_specialist',
  healer: null,
};

export const CLASS_DISADVANTAGE: Record<ClassType, ClassType | null> = {
  combat_specialist: 'tank',
  kido_master: 'combat_specialist',
  tank: 'kido_master',
  healer: null,
};

// ─── Advantage / Disadvantage Modifier ───────────────────────────────
export const ADVANTAGE_BONUS  =  4;
export const DISADVANTAGE_PENALTY = -4;

// ─── Roll Thresholds ─────────────────────────────────────────────────
export const ROLL_FAIL_MAX   = 5;
export const ROLL_MIXED_MAX  = 9;
// 10+ = perfect

// ─── Escape Thresholds (same tiers, CHA-based) ──────────────────────
export const ESCAPE_PERFECT_MIN      = 10;
export const ESCAPE_PARTIAL_MIN      = 6;
// 1–5 = disastrous fail

// ─── HP & Meter Defaults ─────────────────────────────────────────────
export const DEFAULT_MAX_HP          = 250;
export const HITEN_MAX_BARS          = 3;
export const HITEN_GAIN_PER_STRIKE   = 0.5;

// ─── Kenshin Starting Stats ──────────────────────────────────────────
export const KENSHIN_STARTING_STATS: PlayerStats = {
  dex: 7,
  cha: 8,
  wis: 6,
  str: 4,
  con: 4,
};

// ─── Action Economy ──────────────────────────────────────────────────
export const ACTIONS_PER_TURN = 3;

// ─── Leadership Level Thresholds ─────────────────────────────────────
export const LEADERSHIP_STRANGER_MAX  = 10;
export const LEADERSHIP_STRATEGIST_MAX = 20;
// 21+ = commander

// ─── Captain Scaling Rule ────────────────────────────────────────────
export function captainLevelOffset(playerLevel: number): number {
  return playerLevel <= 10 ? 10 : 5;
}

// ─── Respect Thresholds ──────────────────────────────────────────────
export const RESPECT_BLOOD_BROTHERS_MIN = 75;
export const RESPECT_PROFESSIONAL_MIN   = 26;
export const RESPECT_DICK_MIN           = 16;
export const RESPECT_HOSTILE_MIN        = 1;
// 0 = nemesis

// ─── Abandonment Penalty (Escape while in party) ─────────────────────
export const ABANDON_PENALTY_MIN = 5;   // %
export const ABANDON_PENALTY_MAX = 10;  // %
export const TACTICAL_RETREAT_HP_THRESHOLD = 0.25;  // 25 % HP

// ─── Recruitment Thresholds ──────────────────────────────────────────
export const RECRUIT_LIEUTENANT_RESPECT = 75;
export const RECRUIT_CAPTAIN_RESPECT    = 100;

// ─── Card Slot Progression ───────────────────────────────────────────
export function maxCardSlots(level: number): number {
  if (level >= 20) return 5;
  if (level >= 15) return 4;
  if (level >= 10) return 3;
  if (level >= 5)  return 2;
  return 1;
}

// ─── Default NPC Respect Records ─────────────────────────────────────
export const DEFAULT_NPC_RESPECT: Record<string, NpcRespect> = {
  ichigo:   { name: 'Ichigo Kurosaki',  respect: 50, classType: 'combat_specialist', isRecruited: false, recruitTier: null },
  chad:     { name: 'Yasutora Sado',    respect: 50, classType: 'tank',              isRecruited: false, recruitTier: null },
  orihime:  { name: 'Orihime Inoue',    respect: 50, classType: 'healer',            isRecruited: false, recruitTier: null },
  uryu:     { name: 'Uryu Ishida',      respect: 50, classType: 'kido_master',       isRecruited: false, recruitTier: null },
  renji:    { name: 'Renji Abarai',     respect: 40, classType: 'combat_specialist', isRecruited: false, recruitTier: 'lieutenant' },
  rukia:    { name: 'Rukia Kuchiki',    respect: 40, classType: 'kido_master',       isRecruited: false, recruitTier: 'lieutenant' },
  rangiku:  { name: 'Rangiku Matsumoto',respect: 40, classType: 'combat_specialist', isRecruited: false, recruitTier: 'lieutenant' },
  byakuya:  { name: 'Byakuya Kuchiki',  respect: 20, classType: 'combat_specialist', isRecruited: false, recruitTier: 'captain' },
  kenpachi: { name: 'Kenpachi Zaraki',   respect: 20, classType: 'tank',              isRecruited: false, recruitTier: 'captain' },
  unohana:  { name: 'Retsu Unohana',     respect: 20, classType: 'healer',            isRecruited: false, recruitTier: 'captain' },
  mayuri:   { name: 'Mayuri Kurotsuchi', respect: 20, classType: 'kido_master',       isRecruited: false, recruitTier: 'captain' },
  isane:    { name: 'Isane Kotetsu',     respect: 30, classType: 'healer',            isRecruited: false, recruitTier: 'lieutenant' },
};

// ─── Training Mentor Definitions ─────────────────────────────────────
export interface MentorDef {
  stat: keyof PlayerStats;
  maxGain: number;
  penaltyDescription: string;
}

export const MENTOR_MAP: Record<string, MentorDef> = {
  kenpachi: { stat: 'str', maxGain: 2, penaltyDescription: 'Total Exhaustion: Lose all equipped Buff Cards; HP reduced to 1 for 24 hours.' },
  byakuya:  { stat: 'dex', maxGain: 2, penaltyDescription: 'Pride Check: If you fail a WIS roll during training, -15% Respect.' },
  mayuri:   { stat: 'wis', maxGain: 2, penaltyDescription: 'Experimentation: Randomly swaps one Buff Card for a "Cursed" version.' },
  unohana:  { stat: 'wis', maxGain: 2, penaltyDescription: 'Mental Strain: You cannot use "Sass" or "Back Talk" for 3 missions.' },
};

// ─── Class Labels (display) ──────────────────────────────────────────
export const CLASS_LABELS: Record<ClassType, string> = {
  combat_specialist: 'Combat Specialist',
  kido_master: 'Kido Master',
  tank: 'Tank',
  healer: 'Healer',
};
