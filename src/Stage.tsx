import { ReactElement } from "react";
import {
  StageBase,
  InitialData,
  LoadResponse,
  StageResponse,
  Message,
} from "@chub-ai/stages-ts";

export type InitStateType = any;
export type ChatStateType = any;
export type MessageStateType = any;
export type ConfigType = any;

/** A single party member's combat stats. */
interface PartyMember {
  name: string;
  hp: number;
  maxHp: number;
}

/** The Stage's internal RPG state (not persisted directly by chub-ai, stored in messageState). */
export interface RPGInternalState {
  hp: number;
  maxHp: number;
  /** Spiritual pressure / reiatsu (unbounded positive number). */
  kan: number;
  /** Bloodlust percentage (0–100). */
  bloodlust: number;
  party: PartyMember[];
}

/** Summary of stat changes returned by parseHiddenTags: maps tag string → delta applied. */
export type TagChangeSummary = Record<string, number>;

/***
 A Soul Society RPG stage that implements the chub-ai StageBase interface.
 If you rename this class, update App.tsx accordingly.
***/
export class Stage extends StageBase<
  InitStateType,
  ChatStateType,
  MessageStateType,
  ConfigType
> {
  myInternalState: RPGInternalState = {
    hp: 100,
    maxHp: 100,
    kan: 100,
    bloodlust: 0,
    party: [],
  };

  constructor(
    data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>
  ) {
    super(data);
  }

  // ── chub-ai required abstract methods ────────────────────────────────────────

  async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
    console.log("[Stage] loaded");
    return { success: true, error: null };
  }

  async setState(state: MessageStateType): Promise<void> {
    if (state && typeof state === "object") {
      const s = state as Partial<RPGInternalState>;
      if (typeof s.hp === "number") this.myInternalState.hp = s.hp;
      if (typeof s.maxHp === "number") this.myInternalState.maxHp = s.maxHp;
      if (typeof s.kan === "number") this.myInternalState.kan = s.kan;
      if (typeof s.bloodlust === "number") this.myInternalState.bloodlust = s.bloodlust;
      if (Array.isArray(s.party)) this.myInternalState.party = s.party as PartyMember[];
    }
  }

  async beforePrompt(
    _inputMessage: Message
  ): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    return { stageDirections: null, modifiedMessage: null, systemMessage: null, error: null };
  }

  async afterResponse(
    botMessage: Message
  ): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    // The bot's visible response may contain embedded hidden tags (e.g. [HP-10]).
    // Pass the content as both text and hidden so parseHiddenTags can process them.
    this.handleAIResponse({ text: botMessage.content, hidden: botMessage.content });
    return {
      stageDirections: null,
      modifiedMessage: null,
      systemMessage: null,
      messageState: { ...this.myInternalState },
      error: null,
    };
  }

  render(): ReactElement {
    const { hp, maxHp, kan, bloodlust } = this.myInternalState;
    return (
      <div
        style={{
          padding: "1rem",
          fontFamily: "sans-serif",
          color: "#e2e8f0",
          background: "#1a202c",
          minHeight: "100vh",
        }}
      >
        <h2 style={{ color: "#f6e05e" }}>Soul Society RPG</h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <StatBar label="HP" value={hp} max={maxHp} color="#fc8181" />
          <StatBar label="Kan" value={kan} max={100} color="#76e4f7" />
          <StatBar label="Bloodlust" value={bloodlust} max={100} color="#b794f4" />
        </div>
      </div>
    );
  }

  // ── RPG hidden-tag parsing ────────────────────────────────────────────────────

  /**
   * Scans AI response text for hidden stat-modification tags like [HP-10] or [KAN+50]
   * and applies changes to `myInternalState`.
   *
   * Supported syntax:
   *   [STAT+N] / [STAT-N]       — absolute change (e.g. [HP-10], [KAN+50])
   *   [STAT+N%] / [STAT-N%]     — relative change by N percentage points (e.g. [BLOODLUST+10%])
   *   [NAME_STAT+N]             — target a named party member (e.g. [KENSIN_HP-10])
   *
   * @param responseText - The text (typically from a hidden AI message) to scan.
   * @returns A summary object of { tagString: deltaApplied } for logging / tests.
   */
  parseHiddenTags(responseText: string): TagChangeSummary {
    const summary: TagChangeSummary = {};
    const pattern = /\[([A-Z][A-Z0-9_]*)[+-][0-9]+%?\]/gi;

    for (const match of responseText.matchAll(pattern)) {
      const raw = match[0]; // e.g. "[HP-10]" or "[KENSIN_HP+20%]"

      const signMatch = raw.match(/([+-])([0-9]+)(%?)\]/);
      if (!signMatch) continue;

      const sign = signMatch[1] === "+" ? 1 : -1;
      const amount = parseInt(signMatch[2], 10);
      const isPercent = signMatch[3] === "%";
      const innerKey = match[1].toUpperCase();

      // Resolve optional party-member prefix: "KENSIN_HP" => member="KENSIN", stat="HP"
      const underscoreIdx = innerKey.indexOf("_");
      let statKey: string;
      let memberName: string | null = null;

      if (underscoreIdx > 0) {
        memberName = innerKey.slice(0, underscoreIdx);
        statKey = innerKey.slice(underscoreIdx + 1);
      } else {
        statKey = innerKey;
      }

      const delta = sign * amount;

      if (memberName !== null) {
        const member = this.myInternalState.party.find(
          (m) => m.name.toUpperCase() === memberName.toUpperCase()
        );
        if (member) {
          if (statKey === "HP") {
            const change = isPercent
              ? Math.round((delta / 100) * member.maxHp)
              : delta;
            member.hp = Math.max(0, Math.min(member.maxHp, member.hp + change));
            summary[raw] = change;
          } else {
            console.warn(
              `[parseHiddenTags] Unknown stat "${statKey}" for party member "${memberName}"`
            );
          }
        } else {
          console.warn(
            `[parseHiddenTags] Party member "${memberName}" not found for tag ${raw}`
          );
        }
        continue;
      }

      // Apply to party leader
      switch (statKey) {
        case "HP": {
          const change = isPercent
            ? Math.round((delta / 100) * this.myInternalState.maxHp)
            : delta;
          this.myInternalState.hp = Math.max(
            0,
            Math.min(this.myInternalState.maxHp, this.myInternalState.hp + change)
          );
          summary[raw] = change;
          break;
        }
        case "KAN": {
          const change = isPercent ? Math.round((delta / 100) * 100) : delta;
          this.myInternalState.kan = Math.max(0, this.myInternalState.kan + change);
          summary[raw] = change;
          break;
        }
        case "BLOODLUST": {
          // Relative percentage-point change by default
          this.myInternalState.bloodlust = Math.max(
            0,
            Math.min(100, this.myInternalState.bloodlust + delta)
          );
          summary[raw] = delta;
          break;
        }
        default:
          console.warn(`[parseHiddenTags] Unknown stat key "${statKey}" in tag ${raw}`);
      }
    }

    return summary;
  }

  /**
   * Handles an AI response by scanning for hidden stat tags and applying state updates.
   * @param response - Object with the visible text and an optional hidden message.
   */
  handleAIResponse(response: { text: string; hidden?: string }): void {
    const changes = this.parseHiddenTags(response.hidden ?? "");
    if (Object.keys(changes).length > 0) {
      console.log("[Stage] Applied stat changes from AI response:", changes);
    }
  }
}

// ── Utility component ─────────────────────────────────────────────────────────

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ minWidth: "200px" }}>
      <div style={{ marginBottom: "4px", color }}>
        {label}: {value}/{max}
      </div>
      <div
        style={{
          background: "#2d3748",
          borderRadius: "4px",
          overflow: "hidden",
          height: "12px",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}
