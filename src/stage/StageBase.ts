import {
  StageBase as LibraryStageBase,
  InitialData,
  LoadResponse,
  StageResponse,
  Message as LibMessage,
} from "@chub-ai/stages-ts";
import { StageContext, InitState, ChatState, MessageState, ConfigState } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

export abstract class StageBase<
  TInitState extends InitState = any,
  TChatState extends ChatState = any,
  TMessageState extends MessageState = any,
  TConfigState extends ConfigState = any
> extends LibraryStageBase<TInitState, TChatState, TMessageState, TConfigState> {
  ctx: StageContext;
  env: Environment;

  constructor(data: InitialData<TInitState, TChatState, TMessageState, TConfigState>) {
    super(data);
    this.ctx = {
      init: (data.initState ?? {}) as TInitState,
      chat: (data.chatState ?? {}) as TChatState,
      message: (data.messageState ?? {}) as TMessageState,
      config: (data.config ?? {}) as TConfigState,
    };
    this.env = new Environment(this.ctx);
  }

  // Default no-op implementation; subclasses may override to persist state.
  async setState(_state: TMessageState): Promise<void> {}

  async beforePrompt(
    _inputMessage: LibMessage
  ): Promise<Partial<StageResponse<TChatState, TMessageState>>> {
    return {};
  }

  async afterResponse(
    _botMessage: LibMessage
  ): Promise<Partial<StageResponse<TChatState, TMessageState>>> {
    return {};
  }

  async load(): Promise<Partial<LoadResponse<TInitState, TChatState, TMessageState>>> {
    return {};
  }

  abstract onUserMessage(msg: string): Promise<Message[]> | Message[];

  protected reply(text: string): Message {
    return createMessage("assistant", text);
  }

  protected user(text: string): Message {
    return createMessage("user", text);
  }
}