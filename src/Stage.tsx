import React from 'react';
import { BaseStage, StageProps } from './BaseStage';
import {
  LOVE_INTEREST_ROSTER,
  LoveInterest,
  PassiveEffect,
  rollPassiveEffect,
} from './rpg/loveInterests';

// ── Types ───────────────────────────────────

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

/** Phases the game can be in. */
type GamePhase = 'love_interest_select' | 'playing';

// ── Stage ───────────────────────────────────

export class Stage extends BaseStage {
  constructor(props: StageProps) {
    super(props);

    // --- INTERNAL STATE (The Brain) ---
    this.myInternalState['numChars'] = 0;
    this.myInternalState['numUsers'] = 0;

    // Game phase — start with love-interest selection
    this.myInternalState['gamePhase'] = 'love_interest_select' as GamePhase;

    // Core Kenshin Stats
    this.myInternalState['hp'] = 100;
    this.myInternalState['bloodlust'] = 0;
    this.myInternalState['kan'] = 0;
    this.myInternalState['respect'] = 0;

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
      { name: 'Slot 3', hp: 0, maxHp: 100, portrait: 'empty' },
    ];

    // ── Love-Interest / Narrator System ──
    this.myInternalState['loveInterestKey'] = null as string | null;
    this.myInternalState['loveMeter'] = 0;           // 0 – 100
    this.myInternalState['lovePassive'] = null as PassiveEffect | null;
    this.myInternalState['lovePassiveApplied'] = false;
  }

  // ── Love-Interest helpers ──────────────

  /** Returns the chosen LoveInterest object, or null. */
  getChosenLoveInterest(): LoveInterest | null {
    const key = this.myInternalState['loveInterestKey'];
    if (!key) return null;
    return LOVE_INTEREST_ROSTER.find((li) => li.key === key) ?? null;
  }

  /** Called when the player picks their love interest at the start. */
  selectLoveInterest(key: string): void {
    const match = LOVE_INTEREST_ROSTER.find((li) => li.key === key);
    if (!match) return;
    this.myInternalState['loveInterestKey'] = key;
    this.myInternalState['loveMeter'] = 0;
    this.myInternalState['lovePassive'] = null;
    this.myInternalState['lovePassiveApplied'] = false;
    // Transition to playing phase
    this.myInternalState['gamePhase'] = 'playing' as GamePhase;
    console.debug(`[LoveInterest] Selected: ${match.name} — "${match.narratorStyle}"`);
  }

  /**
   * Increase the love meter by `amount` (clamped 0–100).
   * When it reaches 100 for the first time, generate and apply a passive.
   */
  addLove(amount: number): void {
    const before = Number(this.myInternalState['loveMeter'] ?? 0);
    const after = Math.min(100, Math.max(0, before + amount));
    this.myInternalState['loveMeter'] = after;

    if (after >= 100 && !this.myInternalState['lovePassiveApplied']) {
      this.generateAndApplyPassive();
    }
  }

  /** Roll a random passive from the chosen love interest and apply it. */
  private generateAndApplyPassive(): void {
    const interest = this.getChosenLoveInterest();
    if (!interest) return;

    const passive = rollPassiveEffect(interest);
    this.myInternalState['lovePassive'] = passive;
    this.myInternalState['lovePassiveApplied'] = true;

    // Apply the bonus to Kenshin's stats
    const currentVal = Number(this.myInternalState[passive.statKey] ?? 0);
    this.myInternalState[passive.statKey] = currentVal + passive.bonus;

    console.debug(
      `[LoveInterest] 💕 100 % Love! Passive unlocked: "${passive.label}" → ${passive.statKey} ${passive.bonus > 0 ? '+' : ''}${passive.bonus}`
    );
  }

  // ── Background helper ──────────────────

  getBackgroundImage(): string {
    const locs: { [key: string]: string } = {
      karakura_town: 'url_to_karakura_img',
      squad_4_hospital: 'url_to_hospital_img',
      seireitei: 'url_to_seireitei_img',
      hueco_mundo: 'url_to_hueco_mundo_img',
    };
    return locs[this.myInternalState['location']] || '';
  }

  // ── Hidden-tag parsing ─────────────────

  private static tagToKeyMap: { [k: string]: string } = {
    HP: 'hp',
    KAN: 'kan',
    BLOODLUST: 'bloodlust',
    RESPECT: 'respect',
    LOVE: 'love', // maps [LOVE+N] tags to the love meter
  };

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * parseHiddenTags
   * Scans hiddenText for tags like [HP-10], [KAN+50], [HP-10%],
   * [KENSIN_HP-10], and now [LOVE+10].
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
        isPercent,
      };

      try {
        // ── Special handling: LOVE meter ──
        if (mappedKey === 'love' && !targetName) {
          const before = Number(this.myInternalState['loveMeter'] ?? 0);
          const deltaAmount = isPercent
            ? Math.round((deltaSigned / 100) * 100)
            : deltaSigned;
          this.addLove(deltaAmount);
          change.appliedTo = 'loveMeter';
          change.before = before;
          change.after = Number(this.myInternalState['loveMeter']);
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
                ? Math.round(
                    (deltaSigned / 100) * Number(member.maxHp ?? before),
                  )
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
          const currentVal = this.myInternalState[mappedKey];
          if (mappedKey === 'hp') {
            const before = Number(currentVal ?? 0);
            const baseForPercent = Number(
              this.myInternalState?.party?.[0]?.maxHp ?? before,
            );
            const deltaAmount = isPercent
              ? Math.round((deltaSigned / 100) * baseForPercent)
              : deltaSigned;
            const after = this.clamp(before + deltaAmount, 0, baseForPercent);
            this.myInternalState[mappedKey] = after;

            if (this.myInternalState?.party?.length > 0) {
              const member = this.myInternalState.party[0];
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
      } catch (_err) {
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
   * Accepts { text, hidden } from the AI, applies hidden tags, processes text.
   */
  handleAIResponse(response: { text: string; hidden?: string }): ParseSummary {
    const summary = this.parseHiddenTags(response.hidden || '');
    if (typeof response.text === 'string') {
      this.myInternalState['numChars'] =
        (this.myInternalState['numChars'] || 0) + response.text.length;
    }
    if (typeof (this as any).requestUpdate === 'function') {
      try {
        (this as any).requestUpdate();
      } catch (_e) {
        /* ignore */
      }
    }
    return summary;
  }

  // ── Render helpers ─────────────────────

  /** Love-interest selection screen shown at the start of the game. */
  private renderSelectionScreen(): React.ReactNode {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0000 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: "'Segoe UI', sans-serif",
          overflow: 'auto',
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        <h1
          style={{
            color: '#ff4d4d',
            fontSize: '28px',
            marginBottom: '6px',
            textShadow: '0 0 20px rgba(255,77,77,0.6)',
          }}
        >
          Choose Your Narrator &amp; Love Interest
        </h1>
        <p
          style={{
            color: '#ccc',
            maxWidth: '600px',
            textAlign: 'center',
            marginBottom: '30px',
            lineHeight: 1.5,
          }}
        >
          This person will guide you through the Soul Society as your narrator
          — and as your bond deepens, they will unlock a unique power for
          Kenshin.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            justifyContent: 'center',
            maxWidth: '900px',
          }}
        >
          {LOVE_INTEREST_ROSTER.map((li) => (
            <div
              key={li.key}
              onClick={() => this.selectLoveInterest(li.key)}
              style={{
                width: '240px',
                background: 'rgba(30,0,0,0.85)',
                border: '2px solid #910000',
                borderRadius: '12px',
                padding: '18px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 0 12px rgba(145,0,0,0.3)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 0 24px rgba(255,77,77,0.6)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 0 12px rgba(145,0,0,0.3)';
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#ff4d4d',
                  marginBottom: '4px',
                }}
              >
                {li.name}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#ffd700',
                  marginBottom: '10px',
                  fontStyle: 'italic',
                }}
              >
                {li.title}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#bbb',
                  marginBottom: '8px',
                  lineHeight: 1.4,
                }}
              >
                {li.narratorStyle}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                <strong style={{ color: '#aaa' }}>Abilities:</strong>{' '}
                {li.abilities.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /** Render the in-game HUD (party, stats, love meter, overlays). */
  private renderGameHUD(): React.ReactNode {
    const loveMeter = Number(this.myInternalState['loveMeter'] ?? 0);
    const interest = this.getChosenLoveInterest();
    const passive: PassiveEffect | null =
      this.myInternalState['lovePassive'] ?? null;

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
        {/* ── Party HUD (bottom-left) ── */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            gap: '15px',
          }}
        >
          {this.myInternalState['party'].map((member: any, i: number) =>
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
                <div
                  style={{
                    fontWeight: 'bold',
                    color: '#ff4d4d',
                    marginBottom: '5px',
                  }}
                >
                  {member.name}
                </div>
                <div style={{ fontSize: '12px' }}>
                  HP: {member.hp} / {member.maxHp}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: '#333',
                    marginTop: '4px',
                  }}
                >
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

        {/* ── Stats (top-right) ── */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            textAlign: 'right',
            color: 'white',
          }}
        >
          <div style={{ color: '#ffd700' }}>
            KAN: {this.myInternalState['kan']}
          </div>
          <div style={{ color: '#70d6ff' }}>
            BLOODLUST: {this.myInternalState['bloodlust']}%
          </div>
        </div>

        {/* ── Love Meter & Narrator (top-left) ── */}
        {interest && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              border: '2px solid #910000',
              borderRadius: '10px',
              padding: '12px 16px',
              color: 'white',
              minWidth: '200px',
              boxShadow: '0 0 12px rgba(145,0,0,0.4)',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                color: '#ff6b9d',
                marginBottom: '4px',
                fontSize: '14px',
              }}
            >
              💕 {interest.name}
            </div>
            <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '6px' }}>
              {interest.title} — Narrator
            </div>
            {/* Love bar */}
            <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '3px' }}>
              Love: {loveMeter}%
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: '#333',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${loveMeter}%`,
                  height: '100%',
                  background:
                    loveMeter >= 100
                      ? 'linear-gradient(90deg, #ff6b9d, #ffd700)'
                      : '#ff6b9d',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            {/* Passive effect display */}
            {passive && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#ffd700',
                  borderTop: '1px solid #444',
                  paddingTop: '6px',
                }}
              >
                ✨ <strong>{passive.label}</strong>
                <div style={{ color: '#bbb', marginTop: '2px' }}>
                  {passive.description}
                </div>
              </div>
            )}
          </div>
        )}

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

        {/* ── Night scene overlay ── */}
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

  // ── Main render ────────────────────────

  render(): React.ReactNode {
    if (this.myInternalState['gamePhase'] === 'love_interest_select') {
      return this.renderSelectionScreen();
    }
    return this.renderGameHUD();
  }
}
