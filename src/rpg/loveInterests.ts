// ─────────────────────────────────────────────
//  Love-Interest / Narrator roster & passive FX
// ─────────────────────────────────────────────

/** A single passive effect that Kenshin can receive. */
export interface PassiveEffect {
  id: string;
  label: string;
  /** Which internal-state key the bonus applies to. */
  statKey: string;
  /** Flat bonus value added to that stat. */
  bonus: number;
  /** Flavour text shown in the HUD. */
  description: string;
}

/** Definition of a choosable love-interest / narrator. */
export interface LoveInterest {
  key: string;
  name: string;
  title: string;
  /** Short personality description used as narrator flavour. */
  narratorStyle: string;
  /** The abilities this character is known for. */
  abilities: string[];
  /** Pool of possible passive effects (one is drawn at 100 %). */
  passivePool: PassiveEffect[];
  /** Portrait placeholder URL. */
  portrait: string;
}

// ── Roster ──────────────────────────────────

export const LOVE_INTEREST_ROSTER: LoveInterest[] = [
  {
    key: 'orihime',
    name: 'Orihime Inoue',
    title: 'The Healer',
    narratorStyle:
      'Warm and encouraging — sees the best in Kenshin even in the darkest moments.',
    abilities: ['Sōten Kisshun (healing)', 'Santen Kesshun (shielding)', 'Koten Zanshun (rejection)'],
    passivePool: [
      {
        id: 'orihime_regen',
        label: 'Gentle Rejection',
        statKey: 'hp',
        bonus: 5,
        description: 'Orihime\'s warmth restores 5 HP after every encounter.',
      },
      {
        id: 'orihime_shield',
        label: 'Santen Kesshun',
        statKey: 'hp',
        bonus: 15,
        description: 'Orihime\'s shield raises Kenshin\'s max effective HP by 15.',
      },
      {
        id: 'orihime_resolve',
        label: 'Unwavering Faith',
        statKey: 'respect',
        bonus: 10,
        description: 'Orihime\'s belief in Kenshin inspires +10 Respect from allies.',
      },
    ],
    portrait: 'orihime_portrait',
  },
  {
    key: 'rukia',
    name: 'Rukia Kuchiki',
    title: 'The Ice Blade',
    narratorStyle:
      'Calm and tactical — guides Kenshin with quiet determination and sharp insight.',
    abilities: ['Sode no Shirayuki (ice zanpakutō)', 'Kidō mastery', 'Soul Reaper combat'],
    passivePool: [
      {
        id: 'rukia_frost',
        label: 'First Dance: Tsukishiro',
        statKey: 'kan',
        bonus: 20,
        description: 'Rukia\'s ice empowers Kenshin — +20 KAN from chilled resolve.',
      },
      {
        id: 'rukia_calm',
        label: 'White Snow Clarity',
        statKey: 'bloodlust',
        bonus: -15,
        description: 'Rukia\'s presence cools Kenshin\'s rage — Bloodlust reduced by 15.',
      },
      {
        id: 'rukia_tactics',
        label: 'Kuchiki Precision',
        statKey: 'respect',
        bonus: 8,
        description: 'Rukia\'s strategic mind earns Kenshin +8 Respect.',
      },
    ],
    portrait: 'rukia_portrait',
  },
  {
    key: 'rangiku',
    name: 'Rangiku Matsumoto',
    title: 'The Ash Cat',
    narratorStyle:
      'Playful and teasing — masks sharp wisdom behind a carefree façade.',
    abilities: ['Haineko (ash zanpakutō)', 'Kidō', 'Evasion & charm'],
    passivePool: [
      {
        id: 'rangiku_charm',
        label: 'Irresistible Presence',
        statKey: 'respect',
        bonus: 15,
        description: 'Rangiku\'s charm gives Kenshin +15 Respect with everyone.',
      },
      {
        id: 'rangiku_ash',
        label: 'Haineko\'s Veil',
        statKey: 'hp',
        bonus: 10,
        description: 'Ash clouds absorb hits — Kenshin gains +10 effective HP.',
      },
      {
        id: 'rangiku_wit',
        label: 'Sharp Instinct',
        statKey: 'kan',
        bonus: 12,
        description: 'Rangiku\'s street-smarts grant Kenshin +12 KAN.',
      },
    ],
    portrait: 'rangiku_portrait',
  },
  {
    key: 'yoruichi',
    name: 'Yoruichi Shihōin',
    title: 'The Flash Goddess',
    narratorStyle:
      'Confident and mentor-like — pushes Kenshin to be faster, sharper, stronger.',
    abilities: ['Shunpo mastery', 'Shunkō (lightning)', 'Hand-to-hand combat'],
    passivePool: [
      {
        id: 'yoruichi_speed',
        label: 'Flash Step Resonance',
        statKey: 'kan',
        bonus: 25,
        description: 'Yoruichi\'s training sharpens reflexes — +25 KAN.',
      },
      {
        id: 'yoruichi_lightning',
        label: 'Shunkō Spark',
        statKey: 'hp',
        bonus: 8,
        description: 'Lightning-infused stamina gives Kenshin +8 HP.',
      },
      {
        id: 'yoruichi_mentor',
        label: 'Goddess\'s Approval',
        statKey: 'bloodlust',
        bonus: -20,
        description: 'Yoruichi keeps Kenshin centred — Bloodlust reduced by 20.',
      },
    ],
    portrait: 'yoruichi_portrait',
  },
  {
    key: 'nelliel',
    name: 'Nelliel Tu Odelschwanck',
    title: 'The Fierce Protector',
    narratorStyle:
      'Sweet yet fierce — fiercely protective of Kenshin and unafraid of hard truths.',
    abilities: ['Cero Doble', 'Lanzador Verde', 'Resurrección combat'],
    passivePool: [
      {
        id: 'nelliel_cero',
        label: 'Cero Doble Echo',
        statKey: 'kan',
        bonus: 18,
        description: 'Nelliel\'s hollow power amplifies Kenshin — +18 KAN.',
      },
      {
        id: 'nelliel_resilience',
        label: 'Hierro Heart',
        statKey: 'hp',
        bonus: 20,
        description: 'Nelliel\'s resilience hardens Kenshin\'s defences — +20 HP.',
      },
      {
        id: 'nelliel_control',
        label: 'Hollow Harmony',
        statKey: 'bloodlust',
        bonus: -10,
        description: 'Nelliel helps Kenshin channel his darkness — Bloodlust −10.',
      },
    ],
    portrait: 'nelliel_portrait',
  },
];

// ── Helper: roll a random passive from the chosen interest ──

export function rollPassiveEffect(interest: LoveInterest): PassiveEffect {
  const pool = interest.passivePool;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
