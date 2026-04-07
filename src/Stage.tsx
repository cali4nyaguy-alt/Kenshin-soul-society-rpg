import React from 'react';
import { BaseStage, StageProps } from './BaseStage';
import {
  NARRATOR_ORIHIME,
  NARRATORS,
  applySantenKesshun,
  detectEnvironmentalPerks,
  type NarratorBond,
  type EnvironmentalPerk,
  type BuffTier,
} from './rpg';

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
  /** Environmental perks detected in this response */
  perks?: EnvironmentalPerk[];
  /** HP healed by Orihime's passive this turn */
  passiveHeal?: number;
};

export class Stage extends BaseStage {
  constructor(data: StageProps) {
    super(data);

    // --- INTERNAL STATE (The Brain) ---
    this.myInternalState['numChars'] = 0;
    this.myInternalState['numUsers'] = 0;

    // ── Core Kenshin Stats (Level 1) ──
    this.myInternalState['hp'] = 250;
    this.myInternalState['maxHp'] = 250;
    this.myInternalState['hiten_meter'] = 0;
    this.myInternalState['hiten_meter_max'] = 3;
    this.myInternalState['bloodlust'] = 0;
    this.myInternalState['kan'] = 0;
    this.myInternalState['respect'] = 0;
    this.myInternalState['level'] = 1;
    this.myInternalState['element'] = 'storm'; // Storm (Lightning)

    // Character Attributes
    this.myInternalState['stats'] = {
      DEX: 3,
      STR: 3,
      CON: 2,
      INT: 5,
      WIS: 6,
      CHA: 7,
    };

    // Active cards (empty at start)
    this.myInternalState['active_cards'] = [];

    // World & Progression State
    this.myInternalState['location'] = 'karakura_town';
    this.myInternalState['sword_condition'] = 'oversized_sealed';
    this.myInternalState['sword_type'] = 'reverse_blade';
    this.myInternalState['is_bankai_active'] = false;
    this.myInternalState['is_night_scene'] = false;
    this.myInternalState['active_cutaway_id'] = null;
    this.myInternalState['turn'] = 0;

    // The Squad (The HUD)
    this.myInternalState['party'] = [
      { name: 'Kenshin', hp: 250, maxHp: 250, portrait: 'kenshin_neutral' },
      { name: 'Slot 2', hp: 0, maxHp: 100, portrait: 'empty' },
      { name: 'Slot 3', hp: 0, maxHp: 100, portrait: 'empty' },
    ];

    // Romance System
    this.myInternalState['romance'] = {
      orihime: 0,
      rukia: 0,
      rangiku: 0,
    };

    // ── Narrator System ──
    this.myInternalState['narrator'] = NARRATOR_ORIHIME.key;
    this.myInternalState['narrator_bonds'] = {
      [NARRATOR_ORIHIME.key]: { ...NARRATOR_ORIHIME.startingBond },
    } as Record<string, NarratorBond>;

    // ── Buff ledger (active buffs from training / allies) ──
    this.myInternalState['active_buffs'] = [] as Array<{
      name: string;
      tier: BuffTier;
      source: string;
    }>;
  }

  // Helper for Background Logic
  getBackgroundImage() {
    const locs: { [key: string]: string } = {
      karakura_town: 'url_to_karakura_img',
      squad_4_hospital: 'url_to_hospital_img',
      seireitei: 'url_to_seireitei_img',
      hueco_mundo: 'url_to_hueco_mundo_img',
    };
    return locs[this.myInternalState['location']] || '';
  }

  // ── Narrator helpers ───────────────────────────────────────
  /** Get the current narrator's definition. */
  getNarratorDef() {
    return NARRATORS[this.myInternalState['narrator']] ?? NARRATOR_ORIHIME;
  }

  /** Get current narrator bond. */
  getNarratorBond(): NarratorBond {
    const key = this.myInternalState['narrator'];
    return (
      this.myInternalState['narrator_bonds']?.[key] ?? { respect: 0, affection: 0 }
    );
  }

  /** Update narrator bond values (clamped 0‑100). */
  setNarratorBond(delta: Partial<NarratorBond>) {
    const key = this.myInternalState['narrator'];
    const bonds = this.myInternalState['narrator_bonds'] ?? {};
    const current: NarratorBond = bonds[key] ?? { respect: 0, affection: 0 };
    if (delta.respect !== undefined) {
      current.respect = this.clamp(current.respect + delta.respect, 0, 100);
    }
    if (delta.affection !== undefined) {
      current.affection = this.clamp(current.affection + delta.affection, 0, 100);
    }
    bonds[key] = current;
    this.myInternalState['narrator_bonds'] = bonds;
  }

  /**
   * applyStartOfTurnPassive
   * Called when a new turn begins. Applies narrator passives once per turn.
   * Currently handles Orihime's Santen Kesshun (10 % Max HP regen at 100 % affection).
   */
  applyStartOfTurnPassive(): number {
    const nextTurn = (this.myInternalState['turn'] ?? 0) + 1;
    const lastPassiveTurn = this.myInternalState['lastPassiveTurn'] ?? 0;

    // Guard: only apply once per turn
    if (nextTurn <= lastPassiveTurn) return 0;

    this.myInternalState['turn'] = nextTurn;
    this.myInternalState['lastPassiveTurn'] = nextTurn;

    const bond = this.getNarratorBond();
    const hp = Number(this.myInternalState['hp'] ?? 0);
    const maxHp = Number(this.myInternalState['maxHp'] ?? 250);

    const { newHp, healed } = applySantenKesshun(hp, maxHp, bond.affection);
    if (healed > 0) {
      this.myInternalState['hp'] = newHp;
      // Sync party member
      const party: any[] = this.myInternalState['party'] ?? [];
      if (party.length > 0) {
        party[0].hp = Math.min(
          Number(party[0].hp ?? 0) + healed,
          Number(party[0].maxHp ?? maxHp),
        );
      }
    }
    return healed;
  }

  // ── Nested stat helper ─────────────────────────────────────
  /** Allowlist of nested paths to prevent prototype pollution. */
  private static readonly NESTED_PATHS: ReadonlySet<string> = new Set([
    'stats.DEX',
    'stats.STR',
    'stats.CON',
    'stats.INT',
    'stats.WIS',
    'stats.CHA',
  ]);

  private getNestedValue(path: string): number {
    if (!Stage.NESTED_PATHS.has(path)) return Number(this.myInternalState[path] ?? 0);
    const [obj, key] = path.split('.');
    return Number((this.myInternalState[obj] as Record<string, number>)?.[key] ?? 0);
  }

  private setNestedValue(path: string, value: number) {
    if (!Stage.NESTED_PATHS.has(path)) {
      this.myInternalState[path] = value;
      return;
    }
    const [obj, key] = path.split('.');
    if (!this.myInternalState[obj] || typeof this.myInternalState[obj] !== 'object') {
      this.myInternalState[obj] = {};
    }
    (this.myInternalState[obj] as Record<string, number>)[key] = value;
  }

  // --------------------
  // Hidden-tag parsing API
  // --------------------
  private static tagToKeyMap: { [k: string]: string } = {
    HP: 'hp',
    KAN: 'kan',
    BLOODLUST: 'bloodlust',
    RESPECT: 'respect',
    HITEN: 'hiten_meter',
    DEX: 'stats.DEX',
    STR: 'stats.STR',
    CON: 'stats.CON',
    INT: 'stats.INT',
    WIS: 'stats.WIS',
    CHA: 'stats.CHA',
    AFFECTION: 'narrator_affection',
    NARRATORRESPECT: 'narrator_respect',
  };

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * parseHiddenTags
   * Scans hiddenText for tags like [HP-10], [KAN+50], [HP-10%], [KENSHIN_HP-10],
   * [DEX+1], [AFFECTION+5], [NARRATORRESPECT+10], etc.
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
        // Check if the full key (before split) is a known tag first
        const fullUpper = keyPart.toUpperCase();
        if (!Stage.tagToKeyMap[fullUpper]) {
          const idx = keyPart.lastIndexOf('_');
          targetName = keyPart.slice(0, idx);
          statKeyRaw = keyPart.slice(idx + 1);
        }
      }

      const statKeyUpper = statKeyRaw.toUpperCase();
      const mappedKey =
        Stage.tagToKeyMap[statKeyUpper] || statKeyUpper.toLowerCase();

      const change: TagChange = {
        rawTag: fullTag,
        statKey: mappedKey,
        target: targetName,
        delta: deltaSigned,
        isPercent,
      };

      try {
        // ── Narrator bond tags (special handling) ──
        if (mappedKey === 'narrator_affection') {
          const bond = this.getNarratorBond();
          change.before = bond.affection;
          this.setNarratorBond({ affection: deltaSigned });
          change.after = this.getNarratorBond().affection;
          change.appliedTo = 'narrator_bond';
          changes.push(change);
          continue;
        }
        if (mappedKey === 'narrator_respect') {
          const bond = this.getNarratorBond();
          change.before = bond.respect;
          this.setNarratorBond({ respect: deltaSigned });
          change.after = this.getNarratorBond().respect;
          change.appliedTo = 'narrator_bond';
          changes.push(change);
          continue;
        }

        // ── Nested stat paths (DEX, STR, etc.) ──
        if (Stage.NESTED_PATHS.has(mappedKey)) {
          const before = this.getNestedValue(mappedKey);
          const deltaAmount = isPercent
            ? Math.round((deltaSigned / 100) * (before || 1))
            : deltaSigned;
          const after = before + deltaAmount;
          this.setNestedValue(mappedKey, after);
          change.appliedTo = 'global';
          change.before = before;
          change.after = after;
          changes.push(change);
          continue;
        }

        if (targetName) {
          const party: any[] = this.myInternalState['party'] || [];
          const targetNormalized = targetName.toLowerCase();
          const member = party.find(
            (m) => (m.name || '').toString().toLowerCase() === targetNormalized,
          );
          if (member) {
            if (mappedKey === 'hp') {
              const before = Number(member.hp ?? 0);
              const deltaAmount = isPercent
                ? Math.round((deltaSigned / 100) * Number(member.maxHp ?? before))
                : deltaSigned;
              const after = this.clamp(
                before + deltaAmount,
                0,
                Number(member.maxHp ?? before),
              );
              member.hp = after;
              change.appliedTo = `party:${member.name}`;
              change.before = before;
              change.after = after;
            } else {
              const before = Number(member[mappedKey] ?? 0);
              const deltaAmount = isPercent
                ? Math.round((deltaSigned / 100) * (before || 1))
                : deltaSigned;
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
          if (mappedKey === 'hp') {
            const before = Number(this.myInternalState['hp'] ?? 0);
            const baseForPercent = Number(this.myInternalState['maxHp'] ?? 250);
            const deltaAmount = isPercent
              ? Math.round((deltaSigned / 100) * baseForPercent)
              : deltaSigned;
            const after = this.clamp(before + deltaAmount, 0, baseForPercent);
            this.myInternalState['hp'] = after;

            // Sync party slot 0
            const party: any[] = this.myInternalState['party'] ?? [];
            if (party.length > 0) {
              const member = party[0];
              const beforeMember = Number(member.hp ?? 0);
              member.hp = this.clamp(
                beforeMember + deltaAmount,
                0,
                Number(member.maxHp ?? beforeMember),
              );
            }

            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          } else if (mappedKey === 'bloodlust') {
            const before = Number(this.myInternalState[mappedKey] ?? 0);
            const deltaAmount = isPercent
              ? Math.round((deltaSigned / 100) * (before || 100))
              : deltaSigned;
            const after = this.clamp(before + deltaAmount, 0, 100);
            this.myInternalState[mappedKey] = after;
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          } else if (mappedKey === 'hiten_meter') {
            const before = Number(this.myInternalState['hiten_meter'] ?? 0);
            const max = Number(this.myInternalState['hiten_meter_max'] ?? 3);
            const deltaAmount = isPercent
              ? Math.round((deltaSigned / 100) * max)
              : deltaSigned;
            const after = this.clamp(before + deltaAmount, 0, max);
            this.myInternalState['hiten_meter'] = after;
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          } else {
            const before = Number(this.myInternalState[mappedKey] ?? 0);
            const deltaAmount = isPercent
              ? Math.round((deltaSigned / 100) * (before || 1))
              : deltaSigned;
            const after = before + deltaAmount;
            this.myInternalState[mappedKey] = after;
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
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
   * Accepts { text, hidden } from the AI, applies hidden tags first,
   * then detects environmental perks in the visible narration text,
   * and applies start-of-turn passives.
   */
  handleAIResponse(response: { text: string; hidden?: string }): ParseSummary {
    // 1. Apply start-of-turn passive (Orihime's Santen Kesshun)
    const passiveHeal = this.applyStartOfTurnPassive();

    // 2. Parse hidden tags
    const summary = this.parseHiddenTags(response.hidden || '');

    // 3. Detect environmental perks in the narrator's visible text
    const narratorKey = this.myInternalState['narrator'] ?? 'orihime';
    const perks = detectEnvironmentalPerks(narratorKey, response.text ?? '');
    if (perks.length > 0) {
      console.debug('[handleAIResponse] Environmental perks detected:', perks);
    }

    // 4. Track character count
    if (typeof response.text === 'string') {
      this.myInternalState['numChars'] =
        (this.myInternalState['numChars'] || 0) + response.text.length;
    }

    // 5. Request re-render if available
    if (typeof (this as any).requestUpdate === 'function') {
      try {
        (this as any).requestUpdate();
      } catch (_e) {
        /* ignore */
      }
    }

    return { ...summary, perks, passiveHeal };
  }

  render() {
    const narratorDef = this.getNarratorDef();
    const bond = this.getNarratorBond();
    const stats = (this.myInternalState['stats'] ?? {}) as Record<string, number>;
    const hitenMeter = Number(this.myInternalState['hiten_meter'] ?? 0);
    const hitenMax = Number(this.myInternalState['hiten_meter_max'] ?? 3);
    const isPassiveActive = bond.affection >= 100;

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${this.getBackgroundImage()})`,
          backgroundSize: 'cover',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Narrator banner (top‑left) ── */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #f0a0c0',
            color: 'white',
            maxWidth: '280px',
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#f9c', fontSize: '13px' }}>
            🌸 Narrator: {narratorDef.name}
          </div>
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
            <span style={{ color: '#ffd700' }}>Respect {bond.respect}%</span>
            {' / '}
            <span style={{ color: '#ff69b4' }}>Affection {bond.affection}%</span>
          </div>
          {isPassiveActive && (
            <div
              style={{ fontSize: '10px', marginTop: '4px', color: '#7fffbf', fontStyle: 'italic' }}
            >
              ✦ {narratorDef.passiveEffect.name}: {narratorDef.passiveEffect.description}
            </div>
          )}
        </div>

        {/* ── Stats panel (top‑right) ── */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            textAlign: 'right',
            color: 'white',
          }}
        >
          <div style={{ color: '#ffd700' }}>KAN: {this.myInternalState['kan']}</div>
          <div style={{ color: '#70d6ff' }}>
            BLOODLUST: {this.myInternalState['bloodlust']}%
          </div>
          <div style={{ color: '#e0b0ff', marginTop: '4px' }}>
            ⚡ Hiten: {'▮'.repeat(hitenMeter) + '▯'.repeat(hitenMax - hitenMeter)}{' '}
            ({hitenMeter}/{hitenMax})
          </div>
          <div style={{ fontSize: '11px', marginTop: '6px', color: '#ccc' }}>
            Element: <span style={{ color: '#00bfff' }}>{this.myInternalState['element']}</span>
            {' | Lv. '}{this.myInternalState['level']}
          </div>
          <div style={{ fontSize: '10px', marginTop: '4px', color: '#aaa' }}>
            DEX {stats.DEX ?? 0} · STR {stats.STR ?? 0} · CON {stats.CON ?? 0}
            {' · '}
            INT {stats.INT ?? 0} · WIS {stats.WIS ?? 0} · CHA {stats.CHA ?? 0}
          </div>
        </div>

        {/* ── Party HUD (bottom‑left) ── */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            gap: '15px',
          }}
        >
          {(this.myInternalState['party'] as any[]).map((member: any, i: number) =>
            member.name !== 'Slot 2' && member.name !== 'Slot 3' ? (
              <div
                key={i}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '2px solid #910000',
                  color: 'white',
                  minWidth: '160px',
                  boxShadow: '0 0 10px rgba(145, 0, 0, 0.5)',
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#ff4d4d', marginBottom: '5px' }}>
                  {member.name}
                </div>
                <div style={{ fontSize: '12px' }}>
                  HP: {member.hp} / {member.maxHp}
                </div>
                <div style={{ width: '100%', height: '8px', background: '#333', marginTop: '4px' }}>
                  <div
                    style={{
                      width: `${(member.hp / member.maxHp) * 100}%`,
                      height: '100%',
                      background: '#ff4d4d',
                    }}
                  />
                </div>
              </div>
            ) : null,
          )}
        </div>

        {/* ── Cutaway overlay ── */}
        {this.myInternalState['active_cutaway_id'] && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'black',
              zIndex: 1000,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <img
              src={`url_to_cutaway_${this.myInternalState['active_cutaway_id']}`}
              style={{ maxHeight: '100%', maxWidth: '100%' }}
              alt="Cinematic Event"
            />
          </div>
        )}

        {/* ── Night‑scene overlay ── */}
        {this.myInternalState['is_night_scene'] && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'black',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <h2 style={{ color: '#ff4d4d', fontStyle: 'italic' }}>
              ...Hours later in the Seireitei...
            </h2>
            <div style={{ fontSize: '40px' }}>💖</div>
          </div>
        )}
      </div>
    );
  }
}
