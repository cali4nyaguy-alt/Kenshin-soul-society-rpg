import React from 'react';
import { BaseStage, StageProps } from './BaseStage';
import {
  Element,
  PartyMember,
  TeamBoost,
  RPGInternalState,
} from './rpg/types';
import {
  ELEMENTS,
  getCharacterElement,
} from './rpg/constants';
import {
  evaluateTeamSynergy,
  SynergyReport,
  respectMultiplier,
  rollChainTrigger,
} from './rpg/mechanics';

// ---------------------------------------------------------------------------
// Tag-parsing helpers (unchanged logic, just typed)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultPartyMember(
  name: string,
  element: Element,
  combatClass: 'combat_specialist' | 'kido_master' | 'tank',
  respect: number,
  maxHp: number = 100,
): PartyMember {
  return {
    name,
    hp: maxHp,
    maxHp,
    portrait: `${name.toLowerCase().replace(/\s+/g, '_')}_neutral`,
    element,
    combatClass,
    specialMeter: 0,
    respect,
    isExhausted: false,
    exhaustionTurns: 0,
  };
}

/** Colour used to render an element badge. */
const ELEMENT_COLORS: Record<Element, string> = {
  storm: '#a78bfa',   // purple
  fire: '#f87171',    // red
  water: '#38bdf8',   // cyan
  earth: '#a3e635',   // lime
  light: '#fbbf24',   // amber
};

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

export class Stage extends BaseStage {
  constructor(props: StageProps) {
    super(props);

    const s = this.myInternalState as RPGInternalState;

    // --- Core scalars ---
    s.numChars = 0;
    s.numUsers = 0;
    s.hp = 250;
    s.bloodlust = 0;
    s.kan = 0;
    s.respect = 0;

    // --- World & Progression ---
    s.location = 'karakura_town';
    s.sword_condition = 'oversized_sealed';
    s.sword_type = 'reverse_blade';
    s.is_bankai_active = false;
    s.is_night_scene = false;
    s.active_cutaway_id = null;

    // --- Party (Kenshin + Karakura Gang) ---
    const kenshinDef = getCharacterElement('Kenshin')!;
    const ichigoDef  = getCharacterElement('Ichigo')!;
    const orihimeDef = getCharacterElement('Orihime')!;
    const chadDef    = getCharacterElement('Chad')!;
    const uryuDef    = getCharacterElement('Uryu')!;

    s.party = [
      defaultPartyMember('Kenshin',  kenshinDef.element, kenshinDef.combatClass, 100, 250),
      defaultPartyMember('Ichigo',   ichigoDef.element,  ichigoDef.combatClass,  ichigoDef.startingRespect),
      defaultPartyMember('Orihime',  orihimeDef.element, orihimeDef.combatClass, orihimeDef.startingRespect),
      defaultPartyMember('Chad',     chadDef.element,    chadDef.combatClass,    chadDef.startingRespect),
      defaultPartyMember('Uryu',     uryuDef.element,    uryuDef.combatClass,    uryuDef.startingRespect),
    ];

    // --- Romance / Narrator ---
    s.romance = { orihime: 0, rukia: 0, rangiku: 0 };
    s.narrator = null;
    s.narratorAffection = 0;

    // --- Elemental Synergy ---
    s.activeBoosts = [];
    s.activeChainReactions = [];
    s.activeDiscordPenalties = [];
    s.commandLevel = 0;

    // --- Training ---
    s.lastTrainingDomain = null;

    // Evaluate initial synergy
    this.refreshSynergy();
  }

  // ======================================================================
  // Elemental Synergy helpers
  // ======================================================================

  /** Re-evaluate all team synergies and store in state. */
  refreshSynergy(): SynergyReport {
    const s = this.myInternalState as RPGInternalState;
    const report = evaluateTeamSynergy(s.party);

    // Apply Earth "Fortress" boost to maxHp once (idempotent)
    const fortressBoost = report.boosts.find((b) => b.synergyName === 'Fortress');
    for (const m of s.party) {
      // Reset any previously-applied elemental maxHp bonus
      const baseHp = m.name === 'Kenshin' ? 250 : 100;
      m.maxHp = baseHp + (fortressBoost ? fortressBoost.value : 0);
      if (m.hp > m.maxHp) m.hp = m.maxHp;
    }

    // Filter chain reactions through command-level gating
    const activeChains = report.chains.filter(() =>
      rollChainTrigger(s.commandLevel),
    );

    s.activeBoosts = report.boosts;
    s.activeChainReactions = activeChains.map((c) => c.name);
    s.activeDiscordPenalties = report.discords.map(
      (d) => `${d.elements[0]}+${d.elements[1]}`,
    );

    return report;
  }

  /** Get the element-based respect multiplier between two party members. */
  getRespectMultiplier(nameA: string, nameB: string): number {
    const s = this.myInternalState as RPGInternalState;
    const a = s.party.find((m) => m.name === nameA);
    const b = s.party.find((m) => m.name === nameB);
    if (!a || !b) return 1.0;
    return respectMultiplier(a.element, b.element);
  }

  // ======================================================================
  // Background image
  // ======================================================================

  getBackgroundImage(): string {
    const locs: { [key: string]: string } = {
      karakura_town: 'url_to_karakura_img',
      squad_4_hospital: 'url_to_hospital_img',
      seireitei: 'url_to_seireitei_img',
      hueco_mundo: 'url_to_hueco_mundo_img',
    };
    return locs[this.myInternalState['location']] || '';
  }

  // ======================================================================
  // Hidden-tag parsing
  // ======================================================================

  private static tagToKeyMap: { [k: string]: string } = {
    HP: 'hp',
    KAN: 'kan',
    BLOODLUST: 'bloodlust',
    RESPECT: 'respect',
    ELEMENT: 'element',
    SPECIALMETER: 'specialMeter',
    COMMANDLEVEL: 'commandLevel',
  };

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

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
        isPercent,
      };

      try {
        if (targetName) {
          const party: PartyMember[] = (this.myInternalState as RPGInternalState).party || [];
          const targetNormalized = targetName.toLowerCase();
          const member = party.find(
            (m) => m.name.toLowerCase() === targetNormalized,
          );
          if (member) {
            if (mappedKey === 'hp') {
              const before = Number(member.hp ?? 0);
              const deltaAmount = isPercent
                ? Math.round((deltaSigned / 100) * Number(member.maxHp ?? before))
                : deltaSigned;
              const after = this.clamp(before + deltaAmount, 0, Number(member.maxHp ?? before));
              member.hp = after;
              change.appliedTo = `party:${member.name}`;
              change.before = before;
              change.after = after;
            } else {
              const before = Number((member as any)[mappedKey] ?? 0);
              const deltaAmount = isPercent
                ? Math.round((deltaSigned / 100) * (before || 1))
                : deltaSigned;
              const after = before + deltaAmount;
              (member as any)[mappedKey] = after;
              change.appliedTo = `party:${member.name}`;
              change.before = before;
              change.after = after;
            }
          } else {
            change.appliedTo = 'not_found';
          }
        } else {
          const currentVal = this.myInternalState[mappedKey];
          if (mappedKey === 'hp') {
            const before = Number(currentVal ?? 0);
            const baseForPercent = Number(
              (this.myInternalState as RPGInternalState).party?.[0]?.maxHp ?? before,
            );
            const deltaAmount = isPercent
              ? Math.round((deltaSigned / 100) * baseForPercent)
              : deltaSigned;
            const after = this.clamp(before + deltaAmount, 0, baseForPercent);
            this.myInternalState[mappedKey] = after;

            const party = (this.myInternalState as RPGInternalState).party;
            if (party?.length > 0) {
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
            const before = Number(currentVal ?? 0);
            const deltaAmount = isPercent
              ? Math.round((deltaSigned / 100) * (before || 100))
              : deltaSigned;
            const after = this.clamp(before + deltaAmount, 0, 100);
            this.myInternalState[mappedKey] = after;
            change.appliedTo = 'global';
            change.before = before;
            change.after = after;
          } else {
            const before = Number(currentVal ?? 0);
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
      } catch {
        change.appliedTo = 'error';
      }

      changes.push(change);
    }

    // Re-evaluate synergy after any state change
    if (changes.length > 0) {
      this.refreshSynergy();
      console.debug('[parseHiddenTags] Applied changes:', changes);
    }

    return { changes };
  }

  // ======================================================================
  // AI Response handler
  // ======================================================================

  handleAIResponse(response: { text: string; hidden?: string }): ParseSummary {
    const summary = this.parseHiddenTags(response.hidden || '');
    if (typeof response.text === 'string') {
      this.myInternalState['numChars'] =
        (this.myInternalState['numChars'] || 0) + response.text.length;
    }
    if (typeof (this as any).requestUpdate === 'function') {
      try {
        (this as any).requestUpdate();
      } catch {
        /* ignore */
      }
    }
    return summary;
  }

  // ======================================================================
  // Render
  // ======================================================================

  render() {
    const s = this.myInternalState as RPGInternalState;

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${this.getBackgroundImage()})`,
          backgroundSize: 'cover',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        {/* -------- Top-right: KAN / Bloodlust / Command Level -------- */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            textAlign: 'right',
            color: 'white',
            fontSize: '14px',
          }}
        >
          <div style={{ color: '#ffd700' }}>KAN: {s.kan}</div>
          <div style={{ color: '#70d6ff' }}>BLOODLUST: {s.bloodlust}%</div>
          <div style={{ color: '#c084fc' }}>CMD LVL: {s.commandLevel}</div>
        </div>

        {/* -------- Top-left: Active Synergy Boosts -------- */}
        {s.activeBoosts.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px' }}>
              ⚡ SYNERGIES
            </div>
            {s.activeBoosts.map((b: TeamBoost, i: number) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  color: '#a5f3fc',
                  fontSize: '12px',
                  border: '1px solid #164e63',
                }}
              >
                {b.synergyName}: {b.description}
              </div>
            ))}

            {/* Chain Reactions */}
            {s.activeChainReactions.length > 0 && (
              <>
                <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '13px', marginTop: '6px' }}>
                  🔗 CHAINS
                </div>
                {s.activeChainReactions.map((name: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: '#6ee7b7',
                      fontSize: '12px',
                      border: '1px solid #065f46',
                    }}
                  >
                    {name}
                  </div>
                ))}
              </>
            )}

            {/* Discord Penalties */}
            {s.activeDiscordPenalties.length > 0 && (
              <>
                <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: '13px', marginTop: '6px' }}>
                  ⚠️ DISCORD
                </div>
                {s.activeDiscordPenalties.map((key: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: '#fca5a5',
                      fontSize: '12px',
                      border: '1px solid #7f1d1d',
                    }}
                  >
                    {key} — −1 to all D5 rolls
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* -------- Bottom: Party cards with element badges -------- */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
          }}
        >
          {s.party.map((member: PartyMember, i: number) => {
            const elColor = ELEMENT_COLORS[member.element];
            return (
              <div
                key={i}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: `2px solid ${elColor}`,
                  color: 'white',
                  minWidth: '170px',
                  boxShadow: `0 0 12px ${elColor}44`,
                }}
              >
                {/* Name + Element Badge */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontWeight: 'bold', color: '#ff4d4d', fontSize: '14px' }}>
                    {member.name}
                  </span>
                  <span
                    style={{
                      backgroundColor: elColor,
                      color: '#000',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                    }}
                  >
                    {member.element}
                  </span>
                </div>

                {/* HP bar */}
                <div style={{ fontSize: '11px', marginBottom: '2px' }}>
                  HP: {member.hp} / {member.maxHp}
                </div>
                <div style={{ width: '100%', height: '6px', background: '#333', borderRadius: '3px' }}>
                  <div
                    style={{
                      width: `${(member.hp / member.maxHp) * 100}%`,
                      height: '100%',
                      background: '#ff4d4d',
                      borderRadius: '3px',
                    }}
                  />
                </div>

                {/* Special Meter */}
                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                  Special: {'⬛'.repeat(Math.max(0, 3 - Math.min(3, Math.max(0, member.specialMeter))))}{'🟡'.repeat(Math.min(3, Math.max(0, member.specialMeter)))} ({Math.min(3, Math.max(0, member.specialMeter))}/3)
                </div>

                {/* Respect */}
                <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>
                  Respect: {member.respect}%
                </div>

                {/* Exhaustion indicator */}
                {member.isExhausted && (
                  <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '2px' }}>
                    💤 Exhausted ({member.exhaustionTurns}t)
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* -------- Cutaway overlay -------- */}
        {s.active_cutaway_id && (
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
              src={`url_to_cutaway_${s.active_cutaway_id}`}
              style={{ maxHeight: '100%', maxWidth: '100%' }}
              alt="Cinematic Event"
            />
          </div>
        )}

        {/* -------- Night-scene overlay -------- */}
        {s.is_night_scene && (
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

export default Stage;
