import { StageBase as PackageStageBase, InitialData, LoadResponse, StageResponse, Message as PkgMessage } from "@chub-ai/stages-ts";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";
import { StageContext } from "./types";

export abstract class StageBase<
  TInitState extends Record<string, any> = any,
  TChatState extends Record<string, any> = any,
  TMessageState extends Record<string, any> = any,
  TConfigState extends Record<string, any> = any
> extends PackageStageBase<TInitState, TChatState, TMessageState, TConfigState> {
  ctx: StageContext;
  env: Environment;

  protected constructor(data: InitialData<TInitState, TChatState, TMessageState, TConfigState>) {
    super(data);
    this.ctx = {
      init: (data.initState ?? {}) as any,
      chat: (data.chatState ?? {}) as any,
      message: {},
      config: (data.config ?? {}) as any,
    };
    this.env = new Environment(this.ctx);
  }

  abstract load(): Promise<Partial<LoadResponse<TInitState, TChatState, TMessageState>>>;
  abstract setState(state: TMessageState): Promise<void>;
  abstract beforePrompt(inputMessage: PkgMessage): Promise<Partial<StageResponse<TChatState, TMessageState>>>;
  abstract afterResponse(botMessage: PkgMessage): Promise<Partial<StageResponse<TChatState, TMessageState>>>;
  abstract render(): import("react").ReactElement;

  protected reply(text: string): Message {
    return createMessage("assistant", text);
  }

  protected user(text: string): Message {
    return createMessage("user", text);
  }
}