import React from 'react';
import { BaseStage } from './BaseStage';

// ─── Types ──────────────────────────────────────────────────────
type TagChange = {
  rawTag: string;
  statKey: string;
  target?: string;
  delta: number;
  isPercent: boolean;
  appliedTo?: string;
  before?: number;
  after?: number;
};

type ParseSummary = {
  changes: TagChange[];
};

type SoulCard = {
  name: string;
  effect: string;
  tier?: number;
  slot: 'weapon' | 'armor' | 'spirit' | 'utility' | 'wildcard';
};

type CharacterStats = {
  vitality: number;   // +10 Max HP per point
  reiryoku: number;   // Spirit Pressure / Special Gauge
  zanjutsu: number;   // Crit Chance & Accuracy
  hoho: number;       // Dodge Chance & Turn Order
  hakuda: number;     // Physical Defense & Unarmed
  charisma: number;   // Persuasion, Respect Gains, Shop Discounts
};

type ResolutionResult = {
  roll: number;
  modifier: number;
  finalResult: number;
  tier: 'perfect' | 'partial' | 'failure';
};

// ─── Soul Card slot labels (for display) ────────────────────────
const SOUL_CARD_SLOTS: SoulCard['slot'][] = [
  'weapon', 'armor', 'spirit', 'utility', 'wildcard'
];

const EMPTY_CARD = (slot: SoulCard['slot']): SoulCard => ({
  name: 'Empty Slot', effect: 'N/A', slot
});

// ─── Stage Class ────────────────────────────────────────────────
export default class Stage extends BaseStage {
  constructor(init: Record<string, any>, chat: Record<string, any>, config: Record<string, any>) {
    super(init, chat, config);

    // --- INTERNAL STATE (The Brain) ---
    this.myInternalState['numChars'] = 0;
    this.myInternalState['numUsers'] = 0;

    // Core Kenshin Stats
    this.myInternalState['hp'] = 100;
    this.myInternalState['bloodlust'] = 0;
    this.myInternalState['kan'] = 0;
    this.myInternalState['respect'] = 0;

    // ─── The Big Six Attributes ─────────────────────────────────
    this.myInternalState['stats'] = {
      vitality: 10,   // Base HP = 100
      reiryoku: 10,   // Base Spirit Pressure
      zanjutsu: 10,   // Base Accuracy
      hoho: 10,       // Base Speed
      hakuda: 10,     // Base Defense
      charisma: 10    // Base Presence
    } as CharacterStats;
    this.myInternalState['available_points'] = 0;

    // ─── Level & Progression ────────────────────────────────────
    this.myInternalState['level'] = 1;
    this.myInternalState['points_per_level'] = 5;
    this.myInternalState['respec_available'] = false;  // Unlocked at Level 10

    // ─── Soul Cards (5 Equipped Slots) ──────────────────────────
    this.myInternalState['equipped_soul_cards'] = SOUL_CARD_SLOTS.map(
      (slot) => EMPTY_CARD(slot)
    );

    // World & Progression State
    this.myInternalState['location'] = 'karakura_town';
    this.myInternalState['sword_condition'] = 'oversized_sealed';
    this.myInternalState['sword_type'] = 'reverse_blade';
    this.myInternalState['is_bankai_active'] = false;
    this.myInternalState['is_night_scene'] = false;
    this.myInternalState['active_cutaway_id'] = null;

    // The Squad (The HUD)
    this.myInternalState['party'] = [
      { name: 'Kenshin', hp: 100, maxHp: 100, portrait: 'kenshin_neutral' },
      { name: 'Slot 2', hp: 0, maxHp: 100, portrait: 'empty' },
      { name: 'Slot 3', hp: 0, maxHp: 100, portrait: 'empty' }
    ];

    // Romance System
    this.myInternalState['romance'] = {
      'orihime': 0,
      'rukia': 0,
      'rangiku': 0
    };
  }

  // ─── Background Helper ─────────────────────────────────────────
  getBackgroundImage() {
    const locs: { [key: string]: string } = {
      'karakura_town': 'url_to_karakura_img',
      'squad_4_hospital': 'url_to_hospital_img',
      'seireitei': 'url_to_seireitei_img',
      'hueco_mundo': 'url_to_hueco_mundo_img'
    };
    return locs[this.myInternalState['location']] || '';
  }

  // ─── Stat Distribution ────────────────────────────────────────
  /**
   * Distribute available stat points.
   * @param allocation – e.g. { vitality: 2, hoho: 3 }
   * @returns true if allocation succeeded, false if not enough points.
   */
  distributePoints(allocation: Partial<CharacterStats>): boolean {
    const totalRequested = Object.values(allocation).reduce((s, v) => s + (v ?? 0), 0);
    if (totalRequested > this.myInternalState['available_points'] || totalRequested <= 0) {
      return false;
    }
    const stats = this.myInternalState['stats'] as CharacterStats;
    for (const [key, val] of Object.entries(allocation)) {
      if (val && key in stats) {
        (stats as any)[key] += val;
      }
    }
    this.myInternalState['available_points'] -= totalRequested;

    // Vitality recalculates Max HP (+10 per point above base 10)
    const kenshin = this.myInternalState['party']?.[0];
    if (kenshin) {
      kenshin.maxHp = 100 + (stats.vitality - 10) * 10;
      kenshin.hp = Math.min(kenshin.hp, kenshin.maxHp);
    }
    this.myInternalState['hp'] = Math.min(
      this.myInternalState['hp'],
      kenshin?.maxHp ?? 100
    );
    return true;
  }

  // ─── Level-Up ─────────────────────────────────────────────────
  /**
   * Advance the character one level.
   * Awards points_per_level (default 5) stat points.
   * At Level 10, unlock the one-time Reforge (respec).
   */
  levelUp(): void {
    this.myInternalState['level'] += 1;
    this.myInternalState['available_points'] += this.myInternalState['points_per_level'];

    if (this.myInternalState['level'] === 10) {
      this.myInternalState['respec_available'] = true;
    }
  }

  /**
   * Reforge (Level-10 Respec): Reset all stats to base 10 and
   * return every spent point to the available pool.
   */
  respec(): boolean {
    if (!this.myInternalState['respec_available']) return false;

    const stats = this.myInternalState['stats'] as CharacterStats;
    const totalSpent =
      (stats.vitality - 10) +
      (stats.reiryoku - 10) +
      (stats.zanjutsu - 10) +
      (stats.hoho - 10) +
      (stats.hakuda - 10) +
      (stats.charisma - 10);

    stats.vitality = 10;
    stats.reiryoku = 10;
    stats.zanjutsu = 10;
    stats.hoho = 10;
    stats.hakuda = 10;
    stats.charisma = 10;

    this.myInternalState['available_points'] += totalSpent;
    this.myInternalState['respec_available'] = false;

    // Reset Max HP to base
    const kenshin = this.myInternalState['party']?.[0];
    if (kenshin) { kenshin.maxHp = 100; kenshin.hp = Math.min(kenshin.hp, 100); }
    return true;
  }

  // ─── Soul Card Management ────────────────────────────────────
  /**
   * Equip a Soul Card to its designated slot.
   * Only one card per slot; replaces whatever is there.
   */
  equipSoulCard(card: SoulCard): boolean {
    const cards: SoulCard[] = this.myInternalState['equipped_soul_cards'];
    const idx = cards.findIndex((c) => c.slot === card.slot);
    if (idx === -1) return false;
    cards[idx] = card;
    return true;
  }

  /**
   * Unequip a Soul Card from a given slot (replaces with empty).
   */
  unequipSoulCard(slot: SoulCard['slot']): boolean {
    const cards: SoulCard[] = this.myInternalState['equipped_soul_cards'];
    const idx = cards.findIndex((c) => c.slot === slot);
    if (idx === -1) return false;
    cards[idx] = EMPTY_CARD(slot);
    return true;
  }

  // ─── Effective Charisma (accounts for Bloodlust penalty) ─────
  /**
   * When Bloodlust > 75%, CHA is reduced proportionally.
   * At 100% Bloodlust → CHA is halved.
   */
  getEffectiveCharisma(): number {
    const stats = this.myInternalState['stats'] as CharacterStats;
    const bloodlust: number = this.myInternalState['bloodlust'] ?? 0;
    if (bloodlust <= 75) return stats.charisma;
    // Scale from 100% CHA at 75 BL → 50% CHA at 100 BL
    const penalty = 1 - ((bloodlust - 75) / 50); // 75→1.0, 100→0.5
    return Math.max(1, Math.round(stats.charisma * penalty));
  }

  // ─── D10 Resolution Engine ────────────────────────────────────
  /**
   * Roll 1–10 and apply the CHA modifier for social situations.
   * Final Result = roll + floor(effectiveCHA / 10)
   * Tiers: 10+ = perfect, 6–9 = partial, 1–5 = failure
   */
  resolveCheck(context: 'social' | 'combat' | 'flee'): ResolutionResult {
    const roll = Math.floor(Math.random() * 10) + 1; // 1–10
    let modifier = 0;
    if (context === 'social' || context === 'flee') {
      modifier = Math.floor(this.getEffectiveCharisma() / 10);
    }
    const finalResult = Math.min(roll + modifier, 10);
    let tier: ResolutionResult['tier'];
    if (finalResult >= 10) {
      tier = 'perfect';
    } else if (finalResult >= 6) {
      tier = 'partial';
    } else {
      tier = 'failure';
    }
    return { roll, modifier, finalResult, tier };
  }

  // ─── Ending Tier Evaluation ───────────────────────────────────
  /**
   * Evaluate which of the three narrative endings applies.
   */
  evaluateEnding(): 'legend' | 'bittersweet' | 'manslayer' {
    const respect: number = this.myInternalState['respect'] ?? 0;
    const bloodlust: number = this.myInternalState['bloodlust'] ?? 0;

    if (respect >= 80 && bloodlust <= 25) return 'legend';
    if (respect <= 30 || bloodlust >= 75)  return 'manslayer';
    return 'bittersweet';
  }

  // ─── Hidden-tag parsing API ───────────────────────────────────
  private static tagToKeyMap: { [k: string]: string } = {
    HP: 'hp',
    KAN: 'kan',
    BLOODLUST: 'bloodlust',
    RESPECT: 'respect',
    // Stat mappings
    VIT: 'vitality',
    REI: 'reiryoku',
    ZAN: 'zanjutsu',
    HOH: 'hoho',
    HAK: 'hakuda',
    CHA: 'charisma',
    LEVEL: 'level'
  };

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * parseHiddenTags
   * Scans hiddenText for tags like [HP-10], [KAN+50], [HP-10%], [KENSIN_HP-10]
   * Applies updates to myInternalState and party members when applicable.
   */
  parseHiddenTags(hiddenText: string): ParseSummary {
    const changes: TagChange[] = [];
    if (!hiddenText || typeof hiddenText !== 'string') return { changes };

    const regex = /\[([A-Z0-9_]+)([+-])([0-9]+)(%)?\]/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(hiddenText)) !== null) {
      const fullTag = match[0];
      const keyPart = match[1];
      const sign = match[2];
      const numStr = match[3];
      const isPercent = !!match[4];

      const rawValue = parseInt(numStr, 10);
      const deltaSigned = (sign === '+' ? 1 : -1) * rawValue;

      // Handle target like NAME_STAT (split by last underscore)
      let targetName: string | undefined;
      let statKeyRaw = keyPart;
      if (keyPart.includes('_')) {
        const idx = keyPart.lastIndexOf('_');
        targetName = keyPart.slice(0, idx);
        statKeyRaw = keyPart.slice(idx + 1);
      }

      const statKeyUpper = statKeyRaw.toUpperCase();
      const mappedKey =
        Stage.tagToKeyMap[statKeyUpper] || statKeyUpper.toLowerCase();

      const change: TagChange = {
        rawTag: fullTag,
        statKey: mappedKey,
        target: targetName,
        delta: deltaSigned,
        isPercent
      };

      try {
        if (targetName) {
          const party: any[] = this.myInternalState['party'] || [];
          const targetNormalized = targetName.toLowerCase();
          const member = party.find(
            (m) => (m.name || '').toString().toLowerCase() === targetNormalized
          );
          if (member) {
            if (mappedKey === 'hp') {
              const before = Number(member.hp ?? 0);
              let deltaAmount = isPercent
                ? Math.round((deltaSigned / 100) * Number(member.maxHp ?? before))
                : deltaSigned;
              const after = this.clamp(before + deltaAmount, 0, Number(member.maxHp ?? before));
              member.hp = after;
              change.appliedTo = `party:${member.name}`;
              change.before = before;
              change.after = after;
            } else {
              const before = Number(member[mappedKey] ?? 0);
              const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * (before || 1)) : deltaSigned;
              const after = before + deltaAmount;
              member[mappedKey] = after;
              change.appliedTo = `party:${member.name}`;
              change.before = before;
              change.after = after;
            }
          } else {
            change.appliedTo = 'not_found';
          }
        } else {
          // Apply to global myInternalState
          // ─── Stat attributes route into stats sub-object ──────
          const STAT_KEYS = ['vitality','reiryoku','zanjutsu','hoho','hakuda','charisma'];
          if (STAT_KEYS.includes(mappedKey)) {
            const stats = this.myInternalState['stats'] as CharacterStats;
            const before = Number((stats as any)[mappedKey] ?? 0);
            const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * (before || 1)) : deltaSigned;
            const after = Math.max(0, before + deltaAmount);
            (stats as any)[mappedKey] = after;
            // If vitality changed, update Max HP
            if (mappedKey === 'vitality') {
              const kenshin = this.myInternalState['party']?.[0];
              if (kenshin) {
                kenshin.maxHp = 100 + (stats.vitality - 10) * 10;
                kenshin.hp = Math.min(kenshin.hp, kenshin.maxHp);
              }
            }
            change.appliedTo = 'stats';
            change.before = before;
            change.after = after;
          } else if (mappedKey === 'level') {
            // [LEVEL+1] triggers levelUp
            const before = Number(this.myInternalState['level'] ?? 1);
            for (let i = 0; i < Math.abs(deltaSigned); i++) {
              if (deltaSigned > 0) this.levelUp();
            }
            change.appliedTo = 'global';
            change.before = before;
            change.after = Number(this.myInternalState['level']);
          } else {
            const currentVal = this.myInternalState[mappedKey];
            if (mappedKey === 'hp') {
              const before = Number(currentVal ?? 0);
              const baseForPercent = Number(this.myInternalState?.party?.[0]?.maxHp ?? before);
              const deltaAmount = isPercent
                ? Math.round((deltaSigned / 100) * baseForPercent)
                : deltaSigned;
              const after = this.clamp(before + deltaAmount, 0, baseForPercent);
              this.myInternalState[mappedKey] = after;

              if (this.myInternalState?.party?.length > 0) {
                const member = this.myInternalState.party[0];
                const beforeMember = Number(member.hp ?? 0);
                member.hp = this.clamp(beforeMember + deltaAmount, 0, Number(member.maxHp ?? beforeMember));
              }

              change.appliedTo = 'global';
              change.before = before;
              change.after = after;
            } else if (mappedKey === 'bloodlust') {
              const before = Number(currentVal ?? 0);
              const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * (before || 100)) : deltaSigned;
              const after = this.clamp(before + deltaAmount, 0, 100);
              this.myInternalState[mappedKey] = after;
              change.appliedTo = 'global';
              change.before = before;
              change.after = after;
            } else {
              const before = Number(currentVal ?? 0);
              const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * (before || 1)) : deltaSigned;
              const after = before + deltaAmount;
              this.myInternalState[mappedKey] = after;
              change.appliedTo = 'global';
              change.before = before;
              change.after = after;
            }
          }
        }
      } catch (err) {
        change.appliedTo = 'error';
      }

      changes.push(change);
    }

    if (changes.length > 0) {
      console.debug('[parseHiddenTags] Applied changes:', changes);
    }

    return { changes };
  }

  /**
   * handleAIResponse
   * Accepts { text, hidden } from the AI, applies hidden tags first, then processes visible text effects.
   */
  handleAIResponse(response: { text: string; hidden?: string }): ParseSummary {
    const summary = this.parseHiddenTags(response.hidden || '');
    if (typeof response.text === 'string') {
      this.myInternalState['numChars'] = (this.myInternalState['numChars'] || 0) + response.text.length;
    }
    // If BaseStage has update hooks, call them
    if (typeof (this as any).requestUpdate === 'function') {
      try { (this as any).requestUpdate(); } catch (e) { /* ignore */ }
    }
    return summary;
  }

  render() {
    const stats = this.myInternalState['stats'] as CharacterStats;
    const cards: SoulCard[] = this.myInternalState['equipped_soul_cards'];

    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundImage: `url(${this.getBackgroundImage()})`,
        backgroundSize: 'cover', position: 'relative', overflow: 'hidden'
      }}>
        {/* ─── Party HUD (bottom-left) ─────────────────────── */}
        <div style={{
          position: 'absolute', bottom: '20px', left: '20px', display: 'flex', gap: '15px'
        }}>
          {this.myInternalState['party'].map((member: any, i: number) => (
            member.name !== 'Slot 2' && member.name !== 'Slot 3' && (
              <div key={i} style={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: '15px', borderRadius: '8px',
                border: '2px solid #910000', color: 'white', minWidth: '160px',
                boxShadow: '0 0 10px rgba(145, 0, 0, 0.5)'
              }}>
                <div style={{ fontWeight: 'bold', color: '#ff4d4d', marginBottom: '5px' }}>{member.name}</div>
                <div style={{ fontSize: '12px' }}>HP: {member.hp} / {member.maxHp}</div>
                <div style={{ width: '100%', height: '8px', background: '#333', marginTop: '4px' }}>
                  <div style={{ width: `${(member.hp / member.maxHp) * 100}%`, height: '100%', background: '#ff4d4d' }} />
                </div>
              </div>
            )
          ))}
        </div>

        {/* ─── Top-right: Currency, Bloodlust, Level ─────── */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', textAlign: 'right', color: 'white' }}>
          <div style={{ color: '#c0a0ff', fontWeight: 'bold', marginBottom: '2px' }}>
            LVL {this.myInternalState['level']}
            {this.myInternalState['available_points'] > 0 &&
              <span style={{ color: '#00ff88' }}> (+{this.myInternalState['available_points']} pts)</span>
            }
          </div>
          <div style={{ color: '#ffd700' }}>KAN: {this.myInternalState['kan']}</div>
          <div style={{ color: '#70d6ff' }}>BLOODLUST: {this.myInternalState['bloodlust']}%</div>
          <div style={{ color: '#aaddff' }}>RESPECT: {this.myInternalState['respect']}</div>
        </div>

        {/* ─── Top-left: The Big Six Stats ───────────────── */}
        <div style={{
          position: 'absolute', top: '20px', left: '20px', color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '6px',
          border: '1px solid #555', fontSize: '11px', lineHeight: '1.6'
        }}>
          <div style={{ fontWeight: 'bold', color: '#ff9f43', marginBottom: '4px' }}>⚔️ Attributes</div>
          <div>VIT: {stats.vitality}</div>
          <div>REI: {stats.reiryoku}</div>
          <div>ZAN: {stats.zanjutsu}</div>
          <div>HOH: {stats.hoho}</div>
          <div>HAK: {stats.hakuda}</div>
          <div>CHA: {stats.charisma}
            {this.myInternalState['bloodlust'] > 75 &&
              <span style={{ color: '#ff4444' }}> ({this.getEffectiveCharisma()} eff)</span>
            }
          </div>
        </div>

        {/* ─── Bottom-right: Soul Card Loadout ───────────── */}
        <div style={{
          position: 'absolute', bottom: '20px', right: '20px', color: 'white',
          backgroundColor: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '6px',
          border: '1px solid #555', fontSize: '11px', lineHeight: '1.5'
        }}>
          <div style={{ fontWeight: 'bold', color: '#ff9f43', marginBottom: '4px' }}>🎴 Soul Cards</div>
          {cards.map((card, idx) => (
            <div key={idx} style={{ opacity: card.name === 'Empty Slot' ? 0.5 : 1 }}>
              <span style={{ color: '#aaa', textTransform: 'capitalize' }}>[{card.slot}]</span>{' '}
              {card.name}{card.name !== 'Empty Slot' && ` – ${card.effect}`}
            </div>
          ))}
        </div>

        {/* ─── Cinematic Overlays ────────────────────────── */}
        {this.myInternalState['active_cutaway_id'] && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'black', zIndex: 1000, display: 'flex', justifyContent: 'center'
          }}>
            <img
              src={`url_to_cutaway_${this.myInternalState['active_cutaway_id']}`}
              style={{ maxHeight: '100%', maxWidth: '100%' }}
              alt="Cinematic Event"
            />
          </div>
        )}

        {this.myInternalState['is_night_scene'] && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'black', zIndex: 1001, display: 'flex',
            flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
          }}>
            <h2 style={{ color: '#ff4d4d', fontStyle: 'italic' }}>...Hours later in the Seireitei...</h2>
            <div style={{ fontSize: '40px' }}>💖</div>
          </div>
        )}

      </div>
    );
  }
}
