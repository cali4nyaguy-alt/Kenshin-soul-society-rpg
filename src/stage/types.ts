export type InitState = Record<string, any>;
export type ChatState = Record<string, any>;
export type MessageState = Record<string, any>;
export type ConfigState = Record<string, any>;

export interface StageContext {
    init: InitState;
    chat: ChatState;
    message: MessageState;
    config: ConfigState;
}

export interface PartyMember {
    name: string;
    hp: number;
    maxHp: number;
    portrait: string;
}

export interface ParseSummary {
    applied: Array<{ tag: string; field: string; delta: number; newValue: number }>;
    ignored: string[];
}