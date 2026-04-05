import {
  StageBase as LibraryStageBase,
  InitialData,
  LoadResponse,
  StageResponse,
  Message as LibMessage,
} from "@chub-ai/stages-ts";
import { StageContext } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

export abstract class StageBase<
  TInitState = any,
  TChatState = any,
  TMessageState = any,
  TConfigState = any
> extends LibraryStageBase<TInitState, TChatState, TMessageState, TConfigState> {
  ctx: StageContext;
  env: Environment;

  constructor(data: InitialData<TInitState, TChatState, TMessageState, TConfigState>) {
    super(data);
    this.ctx = {
      init: (data.initState ?? {}) as any,
      chat: (data.chatState ?? {}) as any,
      message: (data.messageState ?? {}) as any,
      config: (data.config ?? {}) as any,
    };
    this.env = new Environment(this.ctx);
  }

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