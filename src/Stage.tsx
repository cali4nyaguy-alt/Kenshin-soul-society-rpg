import React from 'react';
import {
    StageBase,
    InitialData,
    Message,
    LoadResponse,
    StageResponse,
} from '@chub-ai/stages-ts';
import { ParseSummary, PartyMember } from './stage/types';

export type InitStateType = any;
export type ChatStateType = any;
export type MessageStateType = any;
export type ConfigType = any;

/***
 Full Kenshin Soul Society RPG Stage.
 Tracks game state in myInternalState and updates it by parsing
 hidden AI tags (e.g. [HP-10], [KAN+50], [HP-10%], [KENSIN_HP-10]).
***/
export class Stage extends StageBase<
    InitStateType,
    ChatStateType,
    MessageStateType,
    ConfigType
> {
    myInternalState: Record<string, any>;
    private readonly initData: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        this.initData = data;

        // --- INTERNAL STATE (The Brain) ---
        this.myInternalState = {};
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
            { name: 'Slot 3', hp: 0, maxHp: 100, portrait: 'empty' },
        ] as PartyMember[];

        // Romance System
        this.myInternalState['romance'] = {
            orihime: 0,
            rukia: 0,
            rangiku: 0,
        };

        // Restore persisted init state if available
        if (data.initState) {
            Object.assign(this.myInternalState, data.initState);
        }
    }

    // ------------------------------------------------------------------ //
    //  Required StageBase abstract methods
    // ------------------------------------------------------------------ //

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        const characters = this.initData?.characters ?? {};
        const users = this.initData?.users ?? {};
        this.myInternalState['numChars'] = Object.keys(characters).length;
        this.myInternalState['numUsers'] = Object.keys(users).length;
        return { success: true, error: null, initState: this.myInternalState };
    }

    async setState(state: MessageStateType): Promise<void> {
        if (state != null) {
            Object.assign(this.myInternalState, state);
        }
    }

    async beforePrompt(inputMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        const statBlock = this.buildStatBlock();
        return {
            stageDirections: statBlock,
            messageState: { ...this.myInternalState },
            chatState: null,
            error: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        // Use a safe pattern: match [HIDDEN]...[/HIDDEN] where content cannot contain '['.
        // This avoids polynomial ReDoS by eliminating nested repetition.
        const hiddenMatch = botMessage.content.match(/\[HIDDEN\]([^\[]*(?:\[[^\[/][^\[]*)*)\[\/HIDDEN\]/i);
        if (hiddenMatch) {
            this.parseHiddenTags(hiddenMatch[1]);
        } else {
            // Also scan the full message for inline tags
            this.parseHiddenTags(botMessage.content);
        }
        return {
            messageState: { ...this.myInternalState },
            chatState: null,
            error: null,
        };
    }

    render(): React.ReactElement {
        const s = this.myInternalState;
        const party: PartyMember[] = s['party'] ?? [];
        const bgImage = this.getBackgroundImage();

        return (
            <div
                className="stage-root"
                style={{
                    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                    backgroundSize: 'cover',
                    minHeight: '100vh',
                    color: '#fff',
                    padding: '1rem',
                    fontFamily: 'serif',
                }}
            >
                {/* HUD */}
                <div className="hud" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    {party.map((member, idx) => (
                        <div key={idx} className="party-member" style={{ border: '1px solid #fff', padding: '0.5rem', minWidth: 80 }}>
                            <div style={{ fontWeight: 'bold' }}>{member.name}</div>
                            <div>HP: {member.hp}/{member.maxHp}</div>
                        </div>
                    ))}
                </div>

                {/* Core Stats */}
                <div className="stats" style={{ marginBottom: '1rem' }}>
                    <span>HP: {s['hp']} </span>
                    <span>KAN: {s['kan']} </span>
                    <span>Bloodlust: {s['bloodlust']} </span>
                    <span>Respect: {s['respect']}</span>
                </div>

                {/* Sword Status */}
                <div className="sword-status">
                    {s['is_bankai_active'] && <strong>[BANKAI ACTIVE]</strong>}
                    <span> {s['sword_type']} / {s['sword_condition']}</span>
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------------ //
    //  Game helpers
    // ------------------------------------------------------------------ //

    /** Build a stat block string to inject as stage directions before the prompt. */
    private buildStatBlock(): string {
        const s = this.myInternalState;
        return [
            `[GAME STATE]`,
            `HP:${s['hp']} KAN:${s['kan']} Bloodlust:${s['bloodlust']} Respect:${s['respect']}`,
            `Location:${s['location']} Sword:${s['sword_type']}/${s['sword_condition']}`,
            s['is_bankai_active'] ? 'BANKAI:ACTIVE' : '',
            `[/GAME STATE]`,
        ].filter(Boolean).join('\n');
    }

    /** Return background image URL for the current location. */
    getBackgroundImage(): string {
        const locs: { [key: string]: string } = {
            karakura_town: 'url_to_karakura_img',
            squad_4_hospital: 'url_to_hospital_img',
            seireitei: 'url_to_seireitei_img',
            hueco_mundo: 'url_to_hueco_mundo_img',
        };
        return locs[this.myInternalState['location']] ?? '';
    }

    // ------------------------------------------------------------------ //
    //  Tag parsing — core feature requested in issue
    // ------------------------------------------------------------------ //

    /**
     * Scans `hiddenText` for RPG state tags and applies them to myInternalState.
     *
     * Supported tag formats:
     *   [HP-10]          subtract 10 from Kenshin's hp
     *   [KAN+50]         add 50 to kan
     *   [HP-10%]         subtract 10 % of current hp (percentage delta)
     *   [BLOODLUST+5]    add 5 to bloodlust
     *   [RESPECT-3]      subtract 3 from respect
     *   [KENSHIN_HP-10]  target tag — same as [HP-10] (KENSHIN is default target)
     *   [SLOT2_HP-20]    subtract 20 from party slot 2 hp
     *   [SLOT3_HP+15]    add 15 to party slot 3 hp
     *
     * Returns a ParseSummary describing what was applied vs ignored.
     */
    parseHiddenTags(hiddenText: string): ParseSummary {
        const summary: ParseSummary = { applied: [], ignored: [] };

        // Match tags like [FIELD+VALUE], [FIELD-VALUE], [TARGET_FIELD+VALUE%?]
        const TAG_RE = /\[([A-Z0-9_]+?)([+-])(\d+)(%?)\]/gi;
        let match: RegExpExecArray | null;

        while ((match = TAG_RE.exec(hiddenText)) !== null) {
            const rawLabel = match[1].toUpperCase();
            const sign = match[2] === '+' ? 1 : -1;
            const rawValue = parseInt(match[3], 10);
            const isPercent = match[4] === '%';
            const fullTag = match[0];

            // Decompose optional TARGET_FIELD pattern
            let target = 'kenshin';
            let field = rawLabel;
            if (rawLabel.includes('_')) {
                const sep = rawLabel.indexOf('_');
                target = rawLabel.slice(0, sep).toLowerCase();
                field = rawLabel.slice(sep + 1);
            }

            const applied = this.applyTag(fullTag, target, field, sign, rawValue, isPercent, summary);
            if (!applied) {
                summary.ignored.push(fullTag);
            }
        }

        return summary;
    }

    /**
     * Convenience wrapper: handles an AI response object that may carry a
     * separate hidden text field alongside the visible text.
     */
    handleAIResponse(response: { text: string; hidden?: string }): ParseSummary {
        const source = response.hidden ?? response.text;
        return this.parseHiddenTags(source);
    }

    // ------------------------------------------------------------------ //
    //  Private tag application helper
    // ------------------------------------------------------------------ //

    private applyTag(
        fullTag: string,
        target: string,
        field: string,
        sign: number,
        rawValue: number,
        isPercent: boolean,
        summary: ParseSummary,
    ): boolean {
        const s = this.myInternalState;

        // Clamp helper
        const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

        // Resolve delta
        const resolveStatField = (key: string) => (typeof s[key] === 'number' ? (s[key] as number) : null);

        // Simple numeric stats on the main character / kenshin
        const MAIN_STATS: Record<string, { key: string; min: number; max: number }> = {
            HP:        { key: 'hp',        min: 0,    max: 100 },
            KAN:       { key: 'kan',       min: 0,    max: 100 },
            BLOODLUST: { key: 'bloodlust', min: 0,    max: 100 },
            RESPECT:   { key: 'respect',   min: 0,    max: 100 },
        };

        if ((target === 'kenshin' || target === 'main') && MAIN_STATS[field]) {
            const { key, min, max } = MAIN_STATS[field];
            const current = resolveStatField(key) ?? 0;
            const delta = isPercent ? Math.round((rawValue / 100) * current * sign) : rawValue * sign;
            const next = clamp(current + delta, min, max);
            s[key] = next;
            summary.applied.push({ tag: fullTag, field: key, delta, newValue: next });
            return true;
        }

        // Party slot HP — targets like SLOT2, SLOT3
        const slotMatch = target.match(/^slot(\d+)$/);
        if (slotMatch && field === 'HP') {
            const slotIndex = parseInt(slotMatch[1], 10) - 1;
            const party: PartyMember[] = s['party'] ?? [];
            if (party[slotIndex] != null) {
                const member = party[slotIndex];
                const current = member.hp;
                const delta = isPercent ? Math.round((rawValue / 100) * current * sign) : rawValue * sign;
                member.hp = clamp(current + delta, 0, member.maxHp);
                summary.applied.push({ tag: fullTag, field: `party[${slotIndex}].hp`, delta, newValue: member.hp });
                return true;
            }
        }

        // Romance stats — targets like ORIHIME, RUKIA, RANGIKU
        const ROMANCE_TARGETS = ['orihime', 'rukia', 'rangiku'];
        if (ROMANCE_TARGETS.includes(target) && field === 'ROMANCE') {
            const romance: Record<string, number> = s['romance'] ?? {};
            const current = typeof romance[target] === 'number' ? romance[target] : 0;
            const delta = isPercent ? Math.round((rawValue / 100) * current * sign) : rawValue * sign;
            romance[target] = clamp(current + delta, 0, 100);
            s['romance'] = romance;
            summary.applied.push({ tag: fullTag, field: `romance.${target}`, delta, newValue: romance[target] });
            return true;
        }

        return false;
    }
}

