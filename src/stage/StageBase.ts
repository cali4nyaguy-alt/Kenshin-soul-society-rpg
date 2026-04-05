import { StageContext, InitState, ChatState, ConfigState } from "./types";
import { Message, createMessage } from "./Message";
import { Environment } from "./Environment";

export abstract class StageBase<
  TInit = any,
  TChat = any,
  TMessage = any,
  TConfig = any
> {
  ctx: StageContext;
  env: Environment;

  constructor(initial: TInit, chat: TChat, config: TConfig) {
    this.ctx = {
      init: initial as InitState,
      chat: chat as ChatState,
      message: {},
      config: config as ConfigState,
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