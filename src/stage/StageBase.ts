import { InitState, ChatState, MessageState, ConfigState, StageContext } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

export abstract class StageBase<
  TInitState extends InitState = any,
  TChatState extends ChatState = any,
  TMessageState extends MessageState = any,
  TConfigState extends ConfigState = any
> {
  ctx: StageContext;
  env: Environment;

  constructor(initial: TInitState, chat: TChatState, config: TConfigState) {
    this.ctx = {
      init: initial,
      chat,
      message: {},
      config,
    };
    this.env = new Environment(this.ctx);
  }

  abstract load(): Promise<void> | void;
  abstract onUserMessage(msg: string): Promise<Message[]> | Message[];

  protected reply(text: string): Message {
    return createMessage("assistant", text);
  }

  protected user(text: string): Message {
    return createMessage("user", text);
  }
}