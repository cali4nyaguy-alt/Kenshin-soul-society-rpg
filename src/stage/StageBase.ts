import {
  StageBase as LibStageBase,
  InitialData,
  LoadResponse,
  StageResponse,
  Message as LibMessage,
} from "@chub-ai/stages-ts";
import { StageContext } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

export abstract class StageBase<
  InitStateType = any,
  ChatStateType = any,
  MessageStateType = any,
  ConfigType = any
> extends LibStageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
  ctx: StageContext;
  env: Environment;

  constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
    super(data);
    // Explicit `as any` cast bridges the concrete StageContext field types (Record<string,any>)
    // and the unconstrained generic parameters. Null-safe with ?? {} fallback.
    this.ctx = {
      init: (data.initState ?? {}) as any,
      chat: (data.chatState ?? {}) as any,
      message: (data.messageState ?? {}) as any,
      config: (data.config ?? {}) as any,
    };
    this.env = new Environment(this.ctx);
  }

  abstract load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>>;
  abstract render(): import("react").ReactElement;

  /** Default no-op stub — subclasses may override to persist message state. */
  async setState(_state: MessageStateType): Promise<void> {}

  /** Default no-op stub — subclasses may override to intercept user messages. */
  async beforePrompt(
    _inputMessage: LibMessage
  ): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    return {};
  }

  /** Default no-op stub — subclasses may override to react to bot responses. */
  async afterResponse(
    _botMessage: LibMessage
  ): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
    return {};
  }

  protected reply(text: string): Message {
    return createMessage("assistant", text);
  }

  protected user(text: string): Message {
    return createMessage("user", text);
  }
}