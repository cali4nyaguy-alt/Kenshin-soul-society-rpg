import React from 'react';
import { BaseStage, StageProps } from './BaseStage';
import {
  RPGState,
  PartyMember,
  ClassType,
  Card,
  HitenMeter,
  PlayerStats,
  NpcRespect,
  RespectTier,
  LeadershipTier,
} from './rpg/types';
import {
  DEFAULT_MAX_HP,
  HITEN_MAX_BARS,
  KENSHIN_STARTING_STATS,
  ACTIONS_PER_TURN,
  DEFAULT_NPC_RESPECT,
  CLASS_LABELS,
  maxCardSlots,
} from './rpg/constants';
import {
  performRoll,
  performEscapeRoll,
  resolveOutcome,
  respectTier,
  leadershipTier,
  abandonmentPenalty,
  gainHitenBar,
  classModifier,
  performSuggestionRoll,
  RollResult,
  EscapeResult,
} from './rpg/mechanics';

// ─── Tag-parsing helpers ─────────────────────────────────────────────
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

// ─── Inline styles ───────────────────────────────────────────────────
const HUD_BG   = 'rgba(0, 0, 0, 0.85)';
const ACCENT   = '#ff4d4d';
const GOLD     = '#ffd700';
const CYAN     = '#70d6ff';
const PURPLE   = '#c084fc';
const GREEN    = '#4ade80';

// =====================================================================
//  Stage  —  The full RPG engine
// =====================================================================
export default class Stage extends BaseStage {

  constructor(props: StageProps) {
    super(props);

    const s = this.myInternalState;

    // ─── Counters ────────────────────────────────────────────
    s['numChars'] = 0;
    s['numUsers'] = 0;

    // ─── Identity & Progression ──────────────────────────────
    s['level']     = 1;
    s['classType'] = 'combat_specialist' as ClassType;

    // ─── Core Stats ──────────────────────────────────────────
    s['stats'] = { ...KENSHIN_STARTING_STATS } as PlayerStats;

    // ─── Health & Special ────────────────────────────────────
    s['hp']    = DEFAULT_MAX_HP;
    s['maxHp'] = DEFAULT_MAX_HP;
    s['hitenMeter'] = { bars: 0, maxBars: HITEN_MAX_BARS } as HitenMeter;

    // ─── Economy ─────────────────────────────────────────────
    s['kan']       = 0;
    s['bloodlust'] = 0;

    // ─── Action Economy ──────────────────────────────────────
    s['actionsPerTurn'] = ACTIONS_PER_TURN;

    // ─── Cards (5 slots max by level 20+) ────────────────────
    s['cards']        = [null, null, null, null, null] as (Card | null)[];
    s['maxCardSlots'] = maxCardSlots(1);

    // ─── Social / Respect ────────────────────────────────────
    s['npcRespect']    = JSON.parse(JSON.stringify(DEFAULT_NPC_RESPECT)) as Record<string, NpcRespect>;
    s['globalRespect'] = 0;

    // ─── Leadership ──────────────────────────────────────────
    s['leadershipTier'] = leadershipTier(1) as LeadershipTier;

    // ─── World & Progression State ───────────────────────────
    s['location']         = 'karakura_town';
    s['swordCondition']   = 'oversized_sealed';
    s['swordType']        = 'reverse_blade';
    s['isBankaiActive']   = false;
    s['isNightScene']     = false;
    s['activeCutawayId']  = null;

    // ─── Empowerment flags ───────────────────────────────────
    s['empowered']      = false;
    s['empoweredBonus'] = 0;

    // ─── The Squad (The HUD) ─────────────────────────────────
    s['party'] = [
      { name: 'Kenshin', hp: DEFAULT_MAX_HP, maxHp: DEFAULT_MAX_HP, portrait: 'kenshin_neutral', classType: 'combat_specialist', level: 1, isActive: true } as PartyMember,
      { name: 'Slot 2',  hp: 0, maxHp: DEFAULT_MAX_HP, portrait: 'empty', isActive: false } as PartyMember,
      { name: 'Slot 3',  hp: 0, maxHp: DEFAULT_MAX_HP, portrait: 'empty', isActive: false } as PartyMember,
    ];

    // ─── Romance System ──────────────────────────────────────
    s['romance'] = { orihime: 0, rukia: 0, rangiku: 0 };
  }

  // ─── Background helper ─────────────────────────────────────────────
  getBackgroundImage(): string {
    const locs: Record<string, string> = {
      karakura_town:   'url_to_karakura_img',
      squad_4_hospital:'url_to_hospital_img',
      seireitei:       'url_to_seireitei_img',
      hueco_mundo:     'url_to_hueco_mundo_img',
    };
    return locs[this.myInternalState['location']] || '';
  }

  // =================================================================
  //  RPG Mechanic Helpers (delegated to rpg/mechanics, surfaced here)
  // =================================================================

  /** Perform a combat/dialogue roll for the player. */
  roll(statKey: keyof PlayerStats, defenderClass: ClassType = 'combat_specialist'): RollResult {
    const s = this.myInternalState;
    const stats: PlayerStats = s['stats'];
    const bonus = s['empowered'] ? (s['empoweredBonus'] || 0) : 0;
    const result = performRoll(
      stats[statKey],
      s['classType'] as ClassType,
      defenderClass,
      bonus,
    );
    // Consume empowerment after first use
    if (s['empowered']) {
      s['empowered'] = false;
      s['empoweredBonus'] = 0;
    }
    return result;
  }

  /** Perform an escape roll (CHA-based). */
  escapeRoll(): EscapeResult {
    const stats: PlayerStats = this.myInternalState['stats'];
    return performEscapeRoll(stats.cha);
  }

  /** Apply abandonment penalty to all active teammates when escaping. */
  applyAbandonmentPenalty(): number {
    const s = this.myInternalState;
    const party: PartyMember[] = s['party'];
    const teammates = party.filter((m) => m.isActive && m.name !== 'Kenshin');
    const hpRatios = teammates.map((m) => m.maxHp > 0 ? m.hp / m.maxHp : 1);
    const penalty = abandonmentPenalty(hpRatios);
    if (penalty !== 0) {
      const npcRespect: Record<string, NpcRespect> = s['npcRespect'];
      for (const tm of teammates) {
        const key = tm.name.toLowerCase().split(' ')[0];
        if (npcRespect[key]) {
          npcRespect[key].respect = Math.max(0, npcRespect[key].respect + penalty);
        }
      }
    }
    return penalty;
  }

  /** Gain Hiten Meter from a strike action. */
  gainHiten(): void {
    const meter: HitenMeter = this.myInternalState['hitenMeter'];
    meter.bars = gainHitenBar(meter.bars);
  }

  /** Spend Hiten Meter bars for a special move. Returns true if successful. */
  spendHiten(cost: number): boolean {
    const meter: HitenMeter = this.myInternalState['hitenMeter'];
    if (meter.bars < cost) return false;
    meter.bars -= cost;
    return true;
  }

  /** Update leadership tier based on current level. */
  refreshLeadership(): void {
    this.myInternalState['leadershipTier'] = leadershipTier(this.myInternalState['level']);
    this.myInternalState['maxCardSlots'] = maxCardSlots(this.myInternalState['level']);
  }

  /** Get a respect tier label for a specific NPC. */
  getNpcRespectTier(npcKey: string): RespectTier | null {
    const npc: NpcRespect | undefined = this.myInternalState['npcRespect']?.[npcKey];
    if (!npc) return null;
    return respectTier(npc.respect);
  }

  // =================================================================
  //  Hidden-tag Parsing
  // =================================================================

  private static tagToKeyMap: Record<string, string> = {
    HP:        'hp',
    KAN:       'kan',
    BLOODLUST: 'bloodlust',
    RESPECT:   'globalRespect',
    DEX:       'stats.dex',
    CHA:       'stats.cha',
    WIS:       'stats.wis',
    STR:       'stats.str',
    CON:       'stats.con',
    LEVEL:     'level',
    HITEN:     'hitenMeter.bars',
  };

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Allowlist of nested paths the tag parser may read/write.
   * This avoids dynamic property traversal entirely, preventing prototype pollution.
   */
  private static readonly NESTED_PATHS: Record<string, { get: (s: Record<string, any>) => number; set: (s: Record<string, any>, v: number) => void }> = {
    'stats.dex': { get: (s) => Number(s['stats']?.dex ?? 0), set: (s, v) => { if (s['stats']) s['stats'].dex = v; } },
    'stats.cha': { get: (s) => Number(s['stats']?.cha ?? 0), set: (s, v) => { if (s['stats']) s['stats'].cha = v; } },
    'stats.wis': { get: (s) => Number(s['stats']?.wis ?? 0), set: (s, v) => { if (s['stats']) s['stats'].wis = v; } },
    'stats.str': { get: (s) => Number(s['stats']?.str ?? 0), set: (s, v) => { if (s['stats']) s['stats'].str = v; } },
    'stats.con': { get: (s) => Number(s['stats']?.con ?? 0), set: (s, v) => { if (s['stats']) s['stats'].con = v; } },
    'hitenMeter.bars': { get: (s) => Number(s['hitenMeter']?.bars ?? 0), set: (s, v) => { if (s['hitenMeter']) s['hitenMeter'].bars = v; } },
  };

  /** Resolve a possibly-nested key like "stats.dex" against myInternalState. */
  private resolveNestedGet(key: string): number {
    const accessor = Stage.NESTED_PATHS[key];
    if (accessor) return accessor.get(this.myInternalState);
    return Number(this.myInternalState[key] ?? 0);
  }

  private resolveNestedSet(key: string, value: number): void {
    const accessor = Stage.NESTED_PATHS[key];
    if (accessor) { accessor.set(this.myInternalState, value); return; }
    // Only allow flat (non-dotted) keys for direct state
    if (!key.includes('.')) {
      this.myInternalState[key] = value;
    }
  }

  parseHiddenTags(hiddenText: string): ParseSummary {
    const changes: TagChange[] = [];
    if (!hiddenText || typeof hiddenText !== 'string') return { changes };

    // ── NPC-specific respect tags: [RESPECT_npckey+10] ──
    const respectRegex = /\[RESPECT_([A-Z0-9]+)([+-])([0-9]+)(%)?\]/gi;
    let rm: RegExpExecArray | null;
    while ((rm = respectRegex.exec(hiddenText)) !== null) {
      const npcKey = rm[1].toLowerCase();
      const sign = rm[2];
      const raw = parseInt(rm[3], 10);
      const delta = (sign === '+' ? 1 : -1) * raw;
      const npc: NpcRespect | undefined = this.myInternalState['npcRespect']?.[npcKey];
      if (npc) {
        const before = npc.respect;
        npc.respect = this.clamp(before + delta, 0, 100);
        changes.push({ rawTag: rm[0], statKey: `respect_${npcKey}`, delta, isPercent: !!rm[4], appliedTo: `npc:${npcKey}`, before, after: npc.respect });
      }
    }

    // ── Standard stat tags ──
    const regex = /\[([A-Z0-9_]+)([+-])([0-9]+)(%)?\]/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(hiddenText)) !== null) {
      // Skip RESPECT_npc tags already handled above
      if (/^RESPECT_/i.test(match[1])) continue;

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
        const possibleStat = keyPart.slice(idx + 1).toUpperCase();
        if (Stage.tagToKeyMap[possibleStat] !== undefined) {
          targetName = keyPart.slice(0, idx);
          statKeyRaw = keyPart.slice(idx + 1);
        }
      }

      const statKeyUpper = statKeyRaw.toUpperCase();
      const mappedKey = Stage.tagToKeyMap[statKeyUpper] || statKeyUpper.toLowerCase();

      const change: TagChange = { rawTag: fullTag, statKey: mappedKey, target: targetName, delta: deltaSigned, isPercent };

      try {
        if (targetName) {
          // Targeted at a party member
          const party: PartyMember[] = this.myInternalState['party'] || [];
          const targetNormalized = targetName.toLowerCase();
          const member = party.find((m) => m.name.toLowerCase() === targetNormalized);
          if (member) {
            if (mappedKey === 'hp') {
              const before = Number(member.hp ?? 0);
              const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * Number(member.maxHp ?? before)) : deltaSigned;
              const after = this.clamp(before + deltaAmount, 0, Number(member.maxHp ?? before));
              member.hp = after;
              change.appliedTo = `party:${member.name}`;
              change.before = before;
              change.after = after;
            } else {
              const memberRecord = member as unknown as Record<string, unknown>;
              const before = Number(memberRecord[mappedKey] ?? 0);
              const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * (before || 1)) : deltaSigned;
              const after = before + deltaAmount;
              memberRecord[mappedKey] = after;
              change.appliedTo = `party:${member.name}`;
              change.before = before;
              change.after = after;
            }
          } else {
            change.appliedTo = 'not_found';
          }
        } else {
          // Global state (possibly nested)
          const before = this.resolveNestedGet(mappedKey);
          if (mappedKey === 'hp') {
            const baseForPercent = Number(this.myInternalState['maxHp'] ?? DEFAULT_MAX_HP);
            const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * baseForPercent) : deltaSigned;
            const after = this.clamp(before + deltaAmount, 0, baseForPercent);
            this.myInternalState['hp'] = after;
            // Sync Kenshin party member
            const party: PartyMember[] = this.myInternalState['party'] || [];
            if (party.length > 0 && party[0].name === 'Kenshin') {
              party[0].hp = after;
            }
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          } else if (mappedKey === 'bloodlust') {
            const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * (before || 100)) : deltaSigned;
            const after = this.clamp(before + deltaAmount, 0, 100);
            this.myInternalState['bloodlust'] = after;
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          } else if (mappedKey === 'hitenMeter.bars') {
            const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * HITEN_MAX_BARS) : deltaSigned;
            const meter: HitenMeter = this.myInternalState['hitenMeter'];
            const after = this.clamp(before + deltaAmount, 0, meter.maxBars);
            meter.bars = after;
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          } else if (mappedKey === 'level') {
            const after = Math.max(1, before + deltaSigned);
            this.myInternalState['level'] = after;
            this.refreshLeadership();
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          } else if (mappedKey.startsWith('stats.')) {
            const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * (before || 1)) : deltaSigned;
            const after = Math.max(0, before + deltaAmount);
            this.resolveNestedSet(mappedKey, after);
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          } else {
            const deltaAmount = isPercent ? Math.round((deltaSigned / 100) * (before || 1)) : deltaSigned;
            const after = before + deltaAmount;
            this.myInternalState[mappedKey] = after;
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          }
        }
      } catch {
        change.appliedTo = 'error';
      }

      changes.push(change);
    }

    if (changes.length > 0) {
      console.debug('[parseHiddenTags] Applied changes:', changes);
    }

    return { changes };
  }

  handleAIResponse(response: { text: string; hidden?: string }): ParseSummary {
    const summary = this.parseHiddenTags(response.hidden || '');
    if (typeof response.text === 'string') {
      this.myInternalState['numChars'] = (this.myInternalState['numChars'] || 0) + response.text.length;
    }
    if (typeof (this as any).requestUpdate === 'function') {
      try { (this as any).requestUpdate(); } catch { /* ignore */ }
    }
    return summary;
  }

  // =================================================================
  //  Render — The HUD
  // =================================================================

  render() {
    const s = this.myInternalState;
    const stats: PlayerStats   = s['stats'];
    const meter: HitenMeter    = s['hitenMeter'];
    const party: PartyMember[] = s['party'];
    const level: number        = s['level'];
    const classLabel           = CLASS_LABELS[s['classType'] as ClassType] || s['classType'];
    const leadership           = (s['leadershipTier'] as string || 'stranger').replace('_', ' ');

    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundImage: `url(${this.getBackgroundImage()})`,
        backgroundSize: 'cover', position: 'relative', overflow: 'hidden',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}>

        {/* ── TOP-LEFT: Level / Class / Leadership ── */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', color: 'white', fontSize: '13px', lineHeight: '1.6' }}>
          <div style={{ color: ACCENT, fontWeight: 'bold', fontSize: '15px' }}>
            Lv {level} — {classLabel}
          </div>
          <div style={{ color: PURPLE, textTransform: 'capitalize' }}>
            Command: {leadership}
          </div>
        </div>

        {/* ── TOP-RIGHT: Economy & Bloodlust ── */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', textAlign: 'right', color: 'white', fontSize: '13px' }}>
          <div style={{ color: GOLD }}>KAN: {s['kan']}</div>
          <div style={{ color: CYAN }}>Bloodlust: {s['bloodlust']}%</div>
        </div>

        {/* ── MID-RIGHT: Core Stats Panel ── */}
        <div style={{
          position: 'absolute', top: '70px', right: '12px',
          background: HUD_BG, padding: '10px 14px', borderRadius: '8px',
          border: `1px solid ${ACCENT}`, color: 'white', fontSize: '12px', lineHeight: '1.7',
        }}>
          <div style={{ color: ACCENT, fontWeight: 'bold', marginBottom: '4px' }}>Stats</div>
          <div>DEX: {stats.dex}</div>
          <div>CHA: {stats.cha}</div>
          <div>WIS: {stats.wis}</div>
          <div>STR: {stats.str}</div>
          <div>CON: {stats.con}</div>
        </div>

        {/* ── HITEN METER (below stats panel) ── */}
        <div style={{
          position: 'absolute', top: '240px', right: '12px',
          background: HUD_BG, padding: '10px 14px', borderRadius: '8px',
          border: `1px solid ${GOLD}`, color: 'white', fontSize: '12px', minWidth: '120px',
        }}>
          <div style={{ color: GOLD, fontWeight: 'bold', marginBottom: '6px' }}>Hiten Meter</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {Array.from({ length: meter.maxBars }).map((_, i) => (
              <div key={i} style={{
                width: '28px', height: '10px', borderRadius: '3px',
                background: i < Math.floor(meter.bars) ? GOLD : '#444',
                border: '1px solid #666',
              }} />
            ))}
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#aaa' }}>
            {meter.bars} / {meter.maxBars} Bars
          </div>
        </div>

        {/* ── BOTTOM-LEFT: Party HUD ── */}
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', display: 'flex', gap: '12px' }}>
          {party.map((member, i) => (
            member.isActive && (
              <div key={i} style={{
                background: HUD_BG, padding: '12px 14px', borderRadius: '8px',
                border: `2px solid ${ACCENT}`, color: 'white', minWidth: '150px',
                boxShadow: `0 0 10px rgba(145, 0, 0, 0.5)`,
              }}>
                <div style={{ fontWeight: 'bold', color: ACCENT, marginBottom: '4px', fontSize: '13px' }}>
                  {member.name}
                  {member.classType && (
                    <span style={{ color: '#aaa', fontWeight: 'normal', fontSize: '11px', marginLeft: '6px' }}>
                      {CLASS_LABELS[member.classType] || ''}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px' }}>HP: {member.hp} / {member.maxHp}</div>
                <div style={{ width: '100%', height: '8px', background: '#333', marginTop: '4px', borderRadius: '4px' }}>
                  <div style={{
                    width: `${member.maxHp > 0 ? (member.hp / member.maxHp) * 100 : 0}%`,
                    height: '100%', background: member.hp / member.maxHp > 0.25 ? ACCENT : '#ff0000',
                    borderRadius: '4px', transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            )
          ))}
        </div>

        {/* ── BOTTOM-RIGHT: Actions & Dialogue reminder ── */}
        <div style={{
          position: 'absolute', bottom: '20px', right: '12px',
          background: HUD_BG, padding: '10px 14px', borderRadius: '8px',
          border: `1px solid ${GREEN}`, color: '#ccc', fontSize: '11px', lineHeight: '1.6', maxWidth: '180px',
        }}>
          <div style={{ color: GREEN, fontWeight: 'bold', marginBottom: '4px' }}>Actions: {s['actionsPerTurn']}/turn</div>
          <div>⚔ Strike · 🛡 Parry/Dodge</div>
          <div>💬 Chat · 📜 Progress</div>
          <div>😏 Sass · 🚪 Escape</div>
          <div>🎯 Custom</div>
        </div>

        {/* ── Cinematic Overlays ── */}
        {s['activeCutawayId'] && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'black', zIndex: 1000, display: 'flex', justifyContent: 'center',
          }}>
            <img
              src={`url_to_cutaway_${s['activeCutawayId']}`}
              style={{ maxHeight: '100%', maxWidth: '100%' }}
              alt="Cinematic Event"
            />
          </div>
        )}

        {s['isNightScene'] && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'black', zIndex: 1001, display: 'flex',
            flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          }}>
            <h2 style={{ color: ACCENT, fontStyle: 'italic' }}>...Hours later in the Seireitei...</h2>
            <div style={{ fontSize: '40px' }}>💖</div>
          </div>
        )}

      </div>
    );
  }
}
