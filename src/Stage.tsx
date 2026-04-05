import React from 'react';
import {
  StageBase,
  InitialData,
  Message,
  StageResponse,
  LoadResponse,
} from '@chub-ai/stages-ts';

type RPGInternalState = Record<string, any>;

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

export class Stage extends StageBase<any, any, any, any> {
  myInternalState: RPGInternalState;

  constructor(data: InitialData<any, any, any, any>) {
    super(data);
    this.myInternalState = {};

    // --- INTERNAL STATE (The Brain) ---
    this.myInternalState['numChars'] = 0;
    this.myInternalState['numUsers'] = 0;
    
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
      { name: 'Slot 3', hp: 0, maxHp: 100, portrait: 'empty' }
    ];

    // Romance System
    this.myInternalState['romance'] = {
      'orihime': 0,
      'rukia': 0,
      'rangiku': 0
    };
  }

  // Helper for Background Logic
  getBackgroundImage() {
    const locs: { [key: string]: string } = {
      'karakura_town': 'url_to_karakura_img',
      'squad_4_hospital': 'url_to_hospital_img',
      'seireitei': 'url_to_seireitei_img',
      'hueco_mundo': 'url_to_hueco_mundo_img'
    };
    return locs[this.myInternalState['location']] || '';
  }

  // --------------------
  // Hidden-tag parsing API
  // --------------------
  private static tagToKeyMap: { [k: string]: string } = {
    HP: 'hp',
    KAN: 'kan',
    BLOODLUST: 'bloodlust',
    RESPECT: 'respect'
    // add more mappings as needed
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

  async load(): Promise<Partial<LoadResponse<any, any, any>>> {
    return { success: true, error: null, initState: null, chatState: null, messageState: null };
  }

  async setState(state: any): Promise<void> {
    if (state && typeof state === 'object') {
      Object.assign(this.myInternalState, state);
    }
  }

  async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<any, any>>> {
    this.myInternalState['numUsers'] = (this.myInternalState['numUsers'] || 0) + 1;
    return {
      stageDirections: null,
      messageState: null,
      modifiedMessage: null,
      error: null,
      systemMessage: null,
      chatState: null,
    };
  }

  async afterResponse(botMessage: Message): Promise<Partial<StageResponse<any, any>>> {
    this.handleAIResponse({ text: botMessage.content, hidden: '' });
    return {
      stageDirections: null,
      messageState: null,
      modifiedMessage: null,
      error: null,
      systemMessage: null,
      chatState: null,
    };
  }

  render() {
    return (
      <div style={{
        width: '100%', height: '100%', 
        backgroundImage: `url(${this.getBackgroundImage()})`, 
        backgroundSize: 'cover', position: 'relative', overflow: 'hidden'
      }}>
        {/* HUD, party, overlays unchanged from previous code */}
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

        <div style={{ position: 'absolute', top: '20px', right: '20px', textAlign: 'right', color: 'white' }}>
          <div style={{ color: '#ffd700' }}>KAN: {this.myInternalState['kan']}</div>
          <div style={{ color: '#70d6ff' }}>BLOODLUST: {this.myInternalState['bloodlust']}%</div>
        </div>

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
