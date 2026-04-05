import React from 'react';
import {
  StageBase,
  InitialData,
  Message,
  DEFAULT_LOAD_RESPONSE,
  DEFAULT_RESPONSE,
} from '@chub-ai/stages-ts';

// ---- Public types ----------------------------------------------------------

export type PartyMember = {
  name: string;
  hp: number;
  maxHp: number;
  portrait: string;
};

export type RPGInternalState = {
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
  party: PartyMember[];
  romance: Record<string, number>;
};

export type ParseSummary = {
  applied: string[];
  errors: string[];
};

// Numeric-only stats stored on myInternalState that can be targeted by RPG tags.
type CoreNumericStat = 'hp' | 'kan' | 'bloodlust' | 'respect';

// ---- Stage class -----------------------------------------------------------

/***
 The main Kenshin Soul Society RPG stage.
 Extends StageBase from @chub-ai/stages-ts (single InitialData constructor arg).
 Implements all required abstract methods and the RPG state / tag-parsing logic.
***/
export default class Stage extends StageBase<RPGInternalState, Record<string, never>, Record<string, never>, Record<string, never>> {
  myInternalState: RPGInternalState;

  constructor(data: InitialData<RPGInternalState, Record<string, never>, Record<string, never>, Record<string, never>>) {
    super(data);

    // --- INTERNAL STATE (The Brain) ---
    this.myInternalState = {
      numChars: 0,
      numUsers: 0,

      // Core Kenshin Stats
      hp: 100,
      bloodlust: 0,
      kan: 0,
      respect: 0,

      // World & Progression State
      location: 'karakura_town',
      sword_condition: 'oversized_sealed', // Starts as "big ass sword"
      sword_type: 'reverse_blade',
      is_bankai_active: false,
      is_night_scene: false,
      active_cutaway_id: null, // e.g., 'kenpachi_fight', 'bankai_flash'

      // The Squad (The HUD)
      party: [
        { name: 'Kenshin', hp: 100, maxHp: 100, portrait: 'kenshin_neutral' },
        { name: 'Slot 2', hp: 0, maxHp: 100, portrait: 'empty' },
        { name: 'Slot 3', hp: 0, maxHp: 100, portrait: 'empty' },
      ],

      // Romance System
      romance: {
        orihime: 0,
        rukia: 0,
        rangiku: 0,
      },
    };
  }

  // ---- Required abstract method implementations --------------------------

  async load() {
    return { ...DEFAULT_LOAD_RESPONSE };
  }

  async setState(state: any) {
    if (state != null) {
      Object.assign(this.myInternalState, state);
    }
  }

  async beforePrompt(_inputMessage: Message) {
    return { ...DEFAULT_RESPONSE };
  }

  async afterResponse(botMessage: Message) {
    const hidden = (botMessage as any).hidden as string | undefined;
    if (hidden) {
      this.handleAIResponse({ text: botMessage.content, hidden });
    }
    return { ...DEFAULT_RESPONSE };
  }

  // ---- Typed accessor for core numeric stats -----------------------------

  private static readonly CORE_MAX_VALUES: Record<CoreNumericStat, number> = {
    hp: 100,
    kan: 100,
    bloodlust: 100,
    respect: 100,
  };

  private getCoreStat(key: CoreNumericStat): number {
    return this.myInternalState[key];
  }

  private setCoreStat(key: CoreNumericStat, value: number): void {
    this.myInternalState[key] = value;
  }

  private isCoreNumericStat(key: string): key is CoreNumericStat {
    return key in Stage.CORE_MAX_VALUES;
  }

  // ---- parseHiddenTags ---------------------------------------------------

  /**
   * Scans the AI's hidden message text for RPG tags and applies them.
   *
   * Supported formats:
   *   [STAT+N]      e.g. [KAN+50]        – add N to core stat
   *   [STAT-N]      e.g. [HP-10]         – subtract N from core stat
   *   [STAT-N%]     e.g. [HP-10%]        – subtract N% of max from core stat
   *   [NAME_STAT-N] e.g. [KENSHIN_HP-10] – apply delta to a named party member
   *
   * Core stats recognised: HP, KAN, BLOODLUST, RESPECT.
   * All values are clamped to [0, max].
   *
   * @returns A ParseSummary describing applied changes and any errors.
   */
  parseHiddenTags(hiddenText: string): ParseSummary {
    const summary: ParseSummary = { applied: [], errors: [] };

    // Optional NAME_ prefix, then STAT, then +/- delta, optional %
    const tagPattern =
      /\[(?:([A-Z][A-Z0-9]*)_)?([A-Z][A-Z0-9]*)([+-])(\d+(?:\.\d+)?)(%?)\]/g;

    const coreMaxValues = Stage.CORE_MAX_VALUES;

    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(hiddenText)) !== null) {
      const [fullTag, charPrefix, statName, sign, rawValue, pct] = match;
      const delta = parseFloat(rawValue) * (sign === '+' ? 1 : -1);
      const isPercent = pct === '%';

      if (charPrefix) {
        // Party member stat (e.g. [KENSHIN_HP-10])
        const member = this.myInternalState.party.find(
          (m) => m.name.toLowerCase() === charPrefix.toLowerCase(),
        );
        if (!member) {
          summary.errors.push(
            `Unknown party member "${charPrefix}" in tag ${fullTag}`,
          );
          continue;
        }
        if (statName === 'HP') {
          const prev = member.hp;
          const change = isPercent
            ? (member.maxHp * Math.abs(delta)) / 100 * (delta < 0 ? -1 : 1)
            : delta;
          member.hp = Math.max(0, Math.min(member.maxHp, prev + change));
          summary.applied.push(
            `${fullTag} → ${member.name} HP ${prev} → ${member.hp}`,
          );
        } else {
          summary.errors.push(
            `Unknown party-member stat "${statName}" in tag ${fullTag}`,
          );
        }
      } else {
        // Core stat on myInternalState (e.g. [HP-10], [KAN+50])
        const statKey = statName.toLowerCase();
        if (!this.isCoreNumericStat(statKey)) {
          summary.errors.push(
            `Unknown core stat "${statName}" in tag ${fullTag}`,
          );
          continue;
        }
        const maxVal = coreMaxValues[statKey];
        const current = this.getCoreStat(statKey);
        const change = isPercent
          ? (maxVal * Math.abs(delta)) / 100 * (delta < 0 ? -1 : 1)
          : delta;
        const newVal = Math.max(0, Math.min(maxVal, current + change));
        this.setCoreStat(statKey, newVal);
        summary.applied.push(`${fullTag} → ${statKey} ${current} → ${newVal}`);
      }
    }

    return summary;
  }

  /**
   * Handles a structured AI response that may contain a hidden field with RPG tags.
   * Delegates to parseHiddenTags if a hidden string is present.
   *
   * @returns A ParseSummary (empty if no hidden field).
   */
  handleAIResponse(response: { text: string; hidden?: string }): ParseSummary {
    if (response.hidden) {
      return this.parseHiddenTags(response.hidden);
    }
    return { applied: [], errors: [] };
  }

  // ---- Helper for Background Logic ---------------------------------------

  getBackgroundImage(): string {
    const locs: { [key: string]: string } = {
      karakura_town: 'url_to_karakura_img',
      squad_4_hospital: 'url_to_hospital_img',
      seireitei: 'url_to_seireitei_img',
      hueco_mundo: 'url_to_hueco_mundo_img',
    };
    return locs[this.myInternalState.location] ?? '';
  }

  // ---- Render ------------------------------------------------------------

  render() {
    const { hp, kan, bloodlust, respect, party } = this.myInternalState;
    return (
      <div
        className="stage-container"
        style={{ backgroundImage: this.getBackgroundImage() }}
      >
        <div className="hud">
          <div>HP: {hp}</div>
          <div>KAN: {kan}</div>
          <div>Bloodlust: {bloodlust}</div>
          <div>Respect: {respect}</div>
        </div>
        <div className="party">
          {party.map((m, i) => (
            <div key={i} className="party-member">
              <span>{m.name}</span>
              <span>
                {m.hp}/{m.maxHp}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

// Named re-export so callers can do either:
//   import Stage from './Stage'
//   import { Stage } from './Stage'
export { Stage };
